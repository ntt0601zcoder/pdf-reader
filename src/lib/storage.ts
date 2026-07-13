import type { Annotation, Bookmark, DocMeta, InkAnnotation, TextAnnotation } from '../types'
import { useStore } from '../store/useStore'
import {
  getLocalAnnotations,
  getLocalBookmarks,
  getLocalInks,
  getLocalTexts,
  putDocMeta,
  putLocalAnnotations,
  putLocalBookmarks,
  putLocalInks,
  putLocalTexts,
} from './idb'
import { createSidecar, findSidecar, loadSidecar, updateSidecar } from './google/drive'
import {
  buildSidecar,
  readBookmarks,
  readInks,
  readLastPage,
  readSidecar,
  readTexts,
  type SidecarPayload,
} from './sidecar'
import { SIDECAR_NAME_SUFFIX } from '../types'

// =============================================================================
// Annotation persistence orchestration.
//   - Drive docs: source of truth is a sidecar JSON in Drive; IndexedDB is a
//     local mirror / offline fallback.
//   - Local docs: source of truth is IndexedDB.
// Saves are debounced; an in-flight suppress flag prevents the act of *loading*
// annotations into the store from immediately writing them back.
// =============================================================================

interface LoadResult {
  annotations: Annotation[]
  bookmarks: Bookmark[]
  inks: InkAnnotation[]
  texts: TextAnnotation[]
  sidecarFileId?: string
  /** Reading position read from the Drive sidecar (for cross-device sync). */
  lastPage?: number
  lastPageAt?: number
}

/** Load all annotation kinds for a document (Drive sidecar or local IndexedDB). */
export async function loadAnnotations(meta: DocMeta): Promise<LoadResult> {
  const local = async (): Promise<LoadResult> => ({
    annotations: await getLocalAnnotations(meta.id),
    bookmarks: await getLocalBookmarks(meta.id),
    inks: await getLocalInks(meta.id),
    texts: await getLocalTexts(meta.id),
  })

  if (meta.source === 'drive' && meta.driveFileId) {
    try {
      const found = await findSidecar(meta.driveFileId)
      if (found) {
        const sidecar = await loadSidecar(found.id)
        const annotations = readSidecar(sidecar)
        const bookmarks = readBookmarks(sidecar)
        const inks = readInks(sidecar)
        const texts = readTexts(sidecar)
        const { lastPage, lastPageAt } = readLastPage(sidecar)
        // Mirror to local for offline.
        await putLocalAnnotations(meta.id, annotations).catch(() => {})
        await putLocalBookmarks(meta.id, bookmarks).catch(() => {})
        await putLocalInks(meta.id, inks).catch(() => {})
        await putLocalTexts(meta.id, texts).catch(() => {})
        return { annotations, bookmarks, inks, texts, sidecarFileId: found.id, lastPage, lastPageAt }
      }
      // No sidecar yet — start from whatever we may have mirrored locally.
      return local()
    } catch {
      // Drive unreachable — fall back to the local mirror.
      return local()
    }
  }
  return local()
}

/** Persist all annotation kinds now (no debounce). Returns the sidecar id. */
export async function saveAnnotationsNow(
  meta: DocMeta,
  p: SidecarPayload,
): Promise<string | undefined> {
  // Always keep the local mirror up to date.
  await putLocalAnnotations(meta.id, p.annotations).catch(() => {})
  await putLocalBookmarks(meta.id, p.bookmarks).catch(() => {})
  await putLocalInks(meta.id, p.inks).catch(() => {})
  await putLocalTexts(meta.id, p.texts).catch(() => {})

  if (meta.source !== 'drive' || !meta.driveFileId) {
    return undefined
  }

  const sidecar = buildSidecar(meta, p)
  // Try the id we know; if it's stale (404), fall through to find/create so a
  // deleted/inaccessible sidecar self-heals into a fresh one (in the app folder).
  if (meta.sidecarFileId) {
    if (await updateSidecar(meta.sidecarFileId, sidecar)) return meta.sidecarFileId
  }
  // Maybe a sidecar exists but we don't know its id yet.
  const found = await findSidecar(meta.driveFileId)
  if (found) {
    if (await updateSidecar(found.id, sidecar)) return found.id
  }
  return createSidecar(meta.driveFileId, `${meta.name}${SIDECAR_NAME_SUFFIX}`, sidecar)
}

// --- Autosave wiring --------------------------------------------------------

let suppress = false
let baselineJson = ''
let baselineDocId: string | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pageTimer: ReturnType<typeof setTimeout> | null = null
// Pushes the settled reading position to the Drive sidecar DURING reading (not
// only on close/hide), so a read-only session still syncs across devices.
let syncTimer: ReturnType<typeof setTimeout> | null = null
// Settled reading position to mirror into the Drive sidecar. We write the
// DEBOUNCED settled page (not the live currentPage, which bounces through
// intermediate values during a smooth scroll), and only when `pageSynced` is
// false (the page genuinely advanced past what Drive already has).
let pageForSync: number | null = null
let pageForSyncAt = 0
let pageSynced = true
// Id of the doc whose annotations have loaded — gates sidecar writes. Doc-keyed
// (not a bare boolean) so a late load from a previous doc can never enable a
// write for the current one, and so no flush can overwrite the Drive sidecar
// with the transient empty array openDoc sets before the real load completes.
let docReadyForId: string | null = null
// A Drive reading position that is newer than this device's but can't be applied
// until the PDF has parsed (numPages known, for range validation). While set,
// the sidecar's position is held at Drive's value so no flush demotes it.
let pendingReconcile: { drivePage: number; driveAt: number; docId: string } | null = null

const SAVE_DEBOUNCE = 900
const PAGE_DEBOUNCE = 1200
// Delay after settling on a new page before pushing the position to Drive. Long
// enough that flipping through pages doesn't spam Drive, short enough to sync
// during a read-only session without waiting for the tab to close.
const PAGE_SYNC_DEBOUNCE = 2500

function stable(
  annotations: Annotation[],
  bookmarks: Bookmark[],
  inks: InkAnnotation[],
  texts: TextAnnotation[],
): string {
  return JSON.stringify({ a: annotations, b: bookmarks, i: inks, t: texts })
}

/**
 * Run `fn` (which sets annotations into the store) without triggering a save —
 * used when *loading* a document's annotations.
 */
export function withSuppressedSave(fn: () => void): void {
  suppress = true
  try {
    fn()
  } finally {
    suppress = false
  }
}

/**
 * Cancel pending timers and clear the autosave baseline. Call on every document
 * transition (open/close) so a timer or stale baseline from the previous doc
 * can never flush into a newly-opened one (which would otherwise overwrite a
 * doc's sidecar with an empty array — data loss).
 */
export function resetAutosave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (pageTimer) {
    clearTimeout(pageTimer)
    pageTimer = null
  }
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  baselineJson = ''
  baselineDocId = null
  pageForSync = null
  pageForSyncAt = 0
  pageSynced = true
  docReadyForId = null
  pendingReconcile = null
}

/**
 * Mark a document's annotations as loaded, so saves (including the close /
 * tab-hide flush) are allowed for it. Doc-keyed: a stale continuation from a
 * previously-open doc can never enable a write for the current doc.
 */
export function markDocReady(docId: string): void {
  docReadyForId = docId
}

/**
 * Seed the settled reading position after a load. `synced=false` means the
 * resolved position differs from what the Drive sidecar holds (e.g. this device
 * read further while offline), so it should be pushed up on the next flush;
 * `synced=true` means Drive already has it (or we adopted Drive's), so a
 * tab-hide with no further reading is a no-op.
 */
export function seedSyncPage(page: number, at: number, synced: boolean): void {
  pageForSync = page
  pageForSyncAt = at
  pageSynced = synced
}

/**
 * Record a Drive reading position that should override this device's once the
 * PDF has parsed, then try to apply it immediately (no-op if numPages isn't
 * known yet — onLoadSuccess re-runs reconcileReadingPosition then).
 */
export function deferReadingPositionJump(drivePage: number, driveAt: number, docId: string): void {
  pendingReconcile = { drivePage, driveAt, docId }
  reconcileReadingPosition()
}

/**
 * Apply a deferred cross-device page jump once numPages is known. Jumps to the
 * Drive page when it is in range, else (out-of-range/stale sidecar) keeps the
 * local page and marks it for push so the valid page replaces Drive's. Safe to
 * call repeatedly; no-op when nothing is pending.
 */
export function reconcileReadingPosition(): void {
  const p = pendingReconcile
  if (!p) return
  const st = useStore.getState()
  if (!st.doc || st.doc.id !== p.docId) {
    pendingReconcile = null
    return
  }
  const numPages = st.numPages
  if (!numPages) return // PDF not parsed yet — retry after setNumPages
  pendingReconcile = null
  if (p.drivePage >= 1 && p.drivePage <= numPages) {
    if (p.drivePage !== st.currentPage) {
      st.setCurrentPage(p.drivePage)
      if (p.drivePage > 1) st.requestScroll(p.drivePage)
    }
    seedSyncPage(p.drivePage, p.driveAt, true) // Drive already holds this
    const synced = { ...st.doc, lastPage: p.drivePage, lastPageAt: p.driveAt }
    useStore.setState({ doc: synced })
    void putDocMeta(synced).catch(() => {})
  } else {
    // Drive's page is out of range for this file — keep the valid local page and
    // mark it dirty so it replaces Drive's bad value on the next save.
    seedSyncPage(st.currentPage, Date.now(), false)
  }
}

async function flushSave(silent = false): Promise<void> {
  const { doc, annotations, bookmarks, inks, texts, currentPage, setSyncStatus } =
    useStore.getState()
  if (!doc) return
  // Never write before THIS doc's annotations have loaded (would clobber them).
  if (docReadyForId !== doc.id) return
  // A pending sync timer is moot — we're saving now.
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  const json = stable(annotations, bookmarks, inks, texts)
  // `silent` saves (background position sync) don't flash the status pill.
  if (!silent) setSyncStatus('saving')
  // Mirror the settled reading position (falls back to the live page on the very
  // first save before any settle). Uses the settle timestamp, not flush time, so
  // "newest wins" reconciliation reflects when the user actually settled there.
  // While a Drive jump is pending (PDF not parsed), preserve Drive's position so
  // an annotation save can't demote a newer cross-device page.
  const page = pendingReconcile ? pendingReconcile.drivePage : pageForSync ?? currentPage
  const at = pendingReconcile
    ? pendingReconcile.driveAt
    : pageForSync != null
      ? pageForSyncAt
      : Date.now()
  try {
    const sidecarId = await saveAnnotationsNow(doc, {
      annotations,
      bookmarks,
      inks,
      texts,
      lastPage: page,
      lastPageAt: at,
    })
    pageSynced = true
    baselineJson = json
    baselineDocId = doc.id
    // Remember the sidecar id on the doc so later saves PATCH instead of search.
    if (sidecarId && sidecarId !== doc.sidecarFileId) {
      const updated = { ...doc, sidecarFileId: sidecarId }
      useStore.setState({ doc: updated })
      await putDocMeta(updated).catch(() => {})
    }
    if (!silent) setSyncStatus(doc.source === 'drive' ? 'saved' : 'local')
  } catch {
    setSyncStatus('error')
  }
}

/** Force an immediate save of the current document's annotations. */
export async function flushNow(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  // Fold a still-pending page settle so an explicit flush (close button / retry)
  // writes the page the user actually ended on, not the last settled one.
  if (pageTimer && !pendingReconcile) {
    clearTimeout(pageTimer)
    pageTimer = null
    const { doc, currentPage } = useStore.getState()
    if (doc && currentPage !== pageForSync) {
      pageForSync = currentPage
      pageForSyncAt = Date.now()
      pageSynced = false
      void putDocMeta({ ...doc, lastPage: currentPage, lastPageAt: pageForSyncAt }).catch(() => {})
    }
  }
  await flushSave()
}

/** Wire store subscriptions for autosave + last-page persistence. Call once. */
export function initAutosave(): () => void {
  const unsubscribe = useStore.subscribe((state, prev) => {
    // --- annotations / bookmarks / ink / text changed -> debounced save ---
    if (
      state.annotations !== prev.annotations ||
      state.bookmarks !== prev.bookmarks ||
      state.inks !== prev.inks ||
      state.texts !== prev.texts
    ) {
      const doc = state.doc
      if (doc) {
        const json = stable(state.annotations, state.bookmarks, state.inks, state.texts)
        if (suppress || doc.id !== baselineDocId) {
          // Loading a doc (or first observation) — set the baseline, don't save.
          // Cancel any timer armed before this transition so it can't fire
          // flushSave() against the transient empty annotations of a reopen.
          if (saveTimer) {
            clearTimeout(saveTimer)
            saveTimer = null
          }
          baselineJson = json
          baselineDocId = doc.id
        } else if (json !== baselineJson) {
          if (saveTimer) clearTimeout(saveTimer)
          saveTimer = setTimeout(() => {
            saveTimer = null
            void flushSave()
          }, SAVE_DEBOUNCE)
        }
      }
    }

    // --- current page changed -> persist lastPage (recent files) ---
    if (state.currentPage !== prev.currentPage && state.doc) {
      const doc = state.doc
      // Capture the page NOW; reading it when the timer fires could pick up a
      // different (or just-closed) document's current page.
      const page = state.currentPage
      const at = Date.now()
      if (pageTimer) clearTimeout(pageTimer)
      pageTimer = setTimeout(() => {
        pageTimer = null
        // While a Drive reconcile is pending the PDF isn't parsed yet; ignore
        // transient pre-jump pages so they can't demote Drive's newer position.
        if (pendingReconcile) return
        // Only act on a genuinely NEW settled page. Debouncing already filters
        // smooth-scroll bounce; this also skips the work entirely when the page
        // is unchanged (e.g. the resume jump settling on the page Drive holds),
        // so neither the local write nor a Drive sync runs for no reason.
        if (page === pageForSync) return
        pageForSync = page
        pageForSyncAt = at
        pageSynced = false
        void putDocMeta({ ...doc, lastPage: page, lastPageAt: at }).catch(() => {})
        // Push the position to Drive shortly after the user settles, so a
        // read-only session syncs without waiting for close/tab-hide. Silent
        // (no status flicker). An annotation save, if pending, will cover it.
        if (doc.source === 'drive') {
          if (syncTimer) clearTimeout(syncTimer)
          syncTimer = setTimeout(() => {
            syncTimer = null
            void flushSave(true)
          }, PAGE_SYNC_DEBOUNCE)
        }
      }, PAGE_DEBOUNCE)
    }
  })

  // Best-effort flush when the tab is hidden (app switch / close) so the reading
  // position (and any pending annotation edits) reach Drive even without an
  // explicit close. Skipped when nothing changed since the last sync.
  const onHide = () => {
    if (document.visibilityState !== 'hidden') return
    if (!useStore.getState().doc) return
    // Only flush when there's a pending edit or an unsynced settled page change.
    if (saveTimer || !pageSynced) void flushNow()
  }
  document.addEventListener('visibilitychange', onHide)

  return () => {
    unsubscribe()
    document.removeEventListener('visibilitychange', onHide)
  }
}

import type { Annotation, Bookmark, DocMeta } from '../types'
import { useStore } from '../store/useStore'
import {
  getLocalAnnotations,
  getLocalBookmarks,
  putDocMeta,
  putLocalAnnotations,
  putLocalBookmarks,
} from './idb'
import { createSidecar, findSidecar, loadSidecar, updateSidecar } from './google/drive'
import { buildSidecar, readBookmarks, readSidecar } from './sidecar'
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
  sidecarFileId?: string
}

/** Load annotations + bookmarks for a document (Drive sidecar or local IndexedDB). */
export async function loadAnnotations(meta: DocMeta): Promise<LoadResult> {
  const local = async (): Promise<LoadResult> => ({
    annotations: await getLocalAnnotations(meta.id),
    bookmarks: await getLocalBookmarks(meta.id),
  })

  if (meta.source === 'drive' && meta.driveFileId) {
    try {
      const found = await findSidecar(meta.driveFileId)
      if (found) {
        const sidecar = await loadSidecar(found.id)
        const annotations = readSidecar(sidecar)
        const bookmarks = readBookmarks(sidecar)
        // Mirror to local for offline.
        await putLocalAnnotations(meta.id, annotations).catch(() => {})
        await putLocalBookmarks(meta.id, bookmarks).catch(() => {})
        return { annotations, bookmarks, sidecarFileId: found.id }
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

/** Persist annotations + bookmarks now (no debounce). Returns the sidecar id. */
export async function saveAnnotationsNow(
  meta: DocMeta,
  annotations: Annotation[],
  bookmarks: Bookmark[],
): Promise<string | undefined> {
  // Always keep the local mirror up to date.
  await putLocalAnnotations(meta.id, annotations).catch(() => {})
  await putLocalBookmarks(meta.id, bookmarks).catch(() => {})

  if (meta.source !== 'drive' || !meta.driveFileId) {
    return undefined
  }

  const sidecar = buildSidecar(meta, annotations, bookmarks)
  if (meta.sidecarFileId) {
    await updateSidecar(meta.sidecarFileId, sidecar)
    return meta.sidecarFileId
  }
  // Maybe a sidecar exists but we don't know its id yet.
  const found = await findSidecar(meta.driveFileId)
  if (found) {
    await updateSidecar(found.id, sidecar)
    return found.id
  }
  return createSidecar(meta.driveFileId, `${meta.name}${SIDECAR_NAME_SUFFIX}`, sidecar)
}

// --- Autosave wiring --------------------------------------------------------

let suppress = false
let baselineJson = ''
let baselineDocId: string | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pageTimer: ReturnType<typeof setTimeout> | null = null

const SAVE_DEBOUNCE = 900
const PAGE_DEBOUNCE = 1200

function stable(annotations: Annotation[], bookmarks: Bookmark[]): string {
  return JSON.stringify({ a: annotations, b: bookmarks })
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
  baselineJson = ''
  baselineDocId = null
}

async function flushSave(): Promise<void> {
  const { doc, annotations, bookmarks, setSyncStatus } = useStore.getState()
  if (!doc) return
  const json = stable(annotations, bookmarks)
  setSyncStatus('saving')
  try {
    const sidecarId = await saveAnnotationsNow(doc, annotations, bookmarks)
    baselineJson = json
    baselineDocId = doc.id
    // Remember the sidecar id on the doc so later saves PATCH instead of search.
    if (sidecarId && sidecarId !== doc.sidecarFileId) {
      const updated = { ...doc, sidecarFileId: sidecarId }
      useStore.setState({ doc: updated })
      await putDocMeta(updated).catch(() => {})
    }
    setSyncStatus(doc.source === 'drive' ? 'saved' : 'local')
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
  await flushSave()
}

/** Wire store subscriptions for autosave + last-page persistence. Call once. */
export function initAutosave(): () => void {
  return useStore.subscribe((state, prev) => {
    // --- annotations or bookmarks changed -> debounced save ---
    if (state.annotations !== prev.annotations || state.bookmarks !== prev.bookmarks) {
      const doc = state.doc
      if (doc) {
        const json = stable(state.annotations, state.bookmarks)
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
      if (pageTimer) clearTimeout(pageTimer)
      pageTimer = setTimeout(() => {
        pageTimer = null
        void putDocMeta({ ...doc, lastPage: page }).catch(() => {})
      }, PAGE_DEBOUNCE)
    }
  })
}

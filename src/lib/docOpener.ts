import type { DocMeta } from '../types'
import { useStore } from '../store/useStore'
import { fetchUserEmail } from './google/auth'
import { downloadPdf } from './google/drive'
import { pickPdf } from './google/picker'
import { cacheFileBlob, getCachedFileBlob, getDocMeta, putDocMeta } from './idb'
import {
  deferReadingPositionJump,
  loadAnnotations,
  markDocReady,
  resetAutosave,
  seedSyncPage,
  withSuppressedSave,
} from './storage'
import { newId } from './highlights'

// =============================================================================
// Orchestrates opening a document from Drive / a local file / the recent list,
// then loading its annotations into the store.
// =============================================================================

function bytesToUint8(buf: ArrayBuffer): Uint8Array {
  // A fresh copy: pdf.js detaches the underlying buffer when it parses.
  return new Uint8Array(buf)
}

/** Apply a freshly-opened doc + its annotations to the store. */
async function applyDoc(meta: DocMeta, bytes: Uint8Array): Promise<void> {
  // Restore the last-read page (and a known sidecar id) from a previous session,
  // even when the doc is opened fresh via the Picker rather than the recents list.
  const existing = await getDocMeta(meta.id).catch(() => undefined)
  const merged: DocMeta = {
    ...meta,
    lastPage: meta.lastPage ?? existing?.lastPage,
    lastPageAt: meta.lastPageAt ?? existing?.lastPageAt,
    sidecarFileId: meta.sidecarFileId ?? existing?.sidecarFileId,
  }

  const store = useStore.getState()
  // Clear any pending save/baseline from a previous doc, and treat openDoc's
  // cleared annotations:[] as part of a *load* (not an edit) so a stale baseline
  // can't flush an empty array over this doc's sidecar before it loads.
  resetAutosave()
  withSuppressedSave(() => store.openDoc(merged, bytes))
  await putDocMeta(merged).catch(() => {})

  // Load annotations + bookmarks without triggering an immediate save-back.
  try {
    const { annotations, bookmarks, inks, texts, sidecarFileId, lastPage, lastPageAt } =
      await loadAnnotations(merged)
    // The user may have opened a different doc while this load was in flight —
    // don't apply this doc's data over the now-current one.
    if (useStore.getState().doc?.id !== merged.id) return
    if (sidecarFileId && sidecarFileId !== merged.sidecarFileId) {
      const withSidecar = { ...merged, sidecarFileId }
      useStore.setState({ doc: withSidecar })
      await putDocMeta(withSidecar).catch(() => {})
    }
    withSuppressedSave(() => {
      useStore.getState().setAnnotations(annotations)
      useStore.getState().setBookmarks(bookmarks)
      useStore.getState().setInks(inks)
      useStore.getState().setTexts(texts)
    })
    markDocReady(merged.id) // annotations loaded — saves may now write the sidecar

    // Reconcile the reading position. If Drive holds a newer position than this
    // device, defer the jump until numPages is known (validated + applied by
    // reconcileReadingPosition, re-run from onLoadSuccess); until then the sidecar
    // keeps Drive's value so nothing demotes it. Otherwise seed the local page,
    // pushing it up when Drive doesn't already hold it.
    const driveWins =
      lastPage != null &&
      lastPage >= 1 &&
      lastPage !== merged.lastPage &&
      (merged.lastPage == null || (lastPageAt ?? 0) > (merged.lastPageAt ?? 0))
    if (driveWins) {
      deferReadingPositionJump(lastPage!, lastPageAt ?? Date.now(), merged.id)
    } else {
      const localPage = merged.lastPage ?? useStore.getState().currentPage
      const alreadyOnDrive = lastPage != null && lastPage === localPage
      seedSyncPage(localPage, merged.lastPageAt ?? 0, alreadyOnDrive)
    }
  } catch {
    if (useStore.getState().doc?.id !== merged.id) return
    withSuppressedSave(() => {
      useStore.getState().setAnnotations([])
      useStore.getState().setBookmarks([])
      useStore.getState().setInks([])
      useStore.getState().setTexts([])
    })
    markDocReady(merged.id)
    // Drive unreachable / no data — nothing to push (a write would fail anyway).
    seedSyncPage(useStore.getState().currentPage, merged.lastPageAt ?? 0, true)
  }
}

/** Open a PDF chosen from Google Drive. */
export async function openFromDrive(): Promise<void> {
  const store = useStore.getState()
  let picked
  try {
    picked = await pickPdf()
  } catch (e) {
    store.setDocError(e instanceof Error ? e.message : 'auth_error')
    return
  }
  if (!picked) return // cancelled

  store.setDocLoading(true)
  try {
    void fetchUserEmail()
    const buf = await downloadPdf(picked.id)
    const meta: DocMeta = {
      id: picked.id,
      source: 'drive',
      name: picked.name,
      driveFileId: picked.id,
      size: buf.byteLength,
      lastOpened: Date.now(),
    }
    await applyDoc(meta, bytesToUint8(buf))
  } catch (e) {
    store.setDocError(e instanceof Error ? e.message : 'drive_error')
  }
}

/** Open a local PDF File (file picker or drag-drop). */
export async function openLocalFile(file: File): Promise<void> {
  const store = useStore.getState()
  store.setDocLoading(true)
  try {
    const buf = await file.arrayBuffer()
    const id = `local:${file.name}:${file.size}:${file.lastModified}`
    const meta: DocMeta = {
      id,
      source: 'local',
      name: file.name,
      size: file.size,
      lastOpened: Date.now(),
    }
    // Cache the blob so it can be reopened from the recent list.
    await cacheFileBlob(id, file).catch(() => {})
    await applyDoc(meta, bytesToUint8(buf))
  } catch (e) {
    store.setDocError(e instanceof Error ? e.message : 'load_error')
  }
}

/** Reopen a document from the recent-files list. */
export async function openRecent(meta: DocMeta): Promise<void> {
  const store = useStore.getState()
  store.setDocLoading(true)
  try {
    let bytes: Uint8Array
    if (meta.source === 'drive' && meta.driveFileId) {
      const buf = await downloadPdf(meta.driveFileId)
      bytes = bytesToUint8(buf)
    } else {
      const blob = await getCachedFileBlob(meta.id)
      if (!blob) {
        store.setDocError('cache_missing')
        return
      }
      bytes = bytesToUint8(await blob.arrayBuffer())
    }
    await applyDoc({ ...meta, lastOpened: Date.now() }, bytes)
  } catch (e) {
    store.setDocError(e instanceof Error ? e.message : 'open_error')
  }
}

// Re-export so callers don't reach into highlights for ids when creating annots.
export { newId }

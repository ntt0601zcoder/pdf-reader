import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Annotation, Bookmark, DocMeta, InkAnnotation, TextAnnotation } from '../types'

// =============================================================================
// Local persistence (IndexedDB).
//   - `docs`        : recent-files list + per-doc metadata (last page, ids).
//   - `annotations` : one record per doc holding the full annotation array.
//   - `files`       : cached blobs of LOCAL pdfs so they reopen without picking
//                     again. Drive PDFs are NOT cached (re-fetched from Drive).
// For Drive docs IndexedDB is just a fast local mirror; Drive is the source of
// truth. For local docs IndexedDB is the source of truth.
// =============================================================================

interface ReaderDB extends DBSchema {
  docs: {
    key: string
    value: DocMeta
    indexes: { lastOpened: number }
  }
  annotations: {
    key: string // docId
    value: { docId: string; list: Annotation[]; updatedAt: number }
  }
  bookmarks: {
    key: string // docId
    value: { docId: string; list: Bookmark[]; updatedAt: number }
  }
  inks: {
    key: string // docId
    value: { docId: string; list: InkAnnotation[]; updatedAt: number }
  }
  texts: {
    key: string // docId
    value: { docId: string; list: TextAnnotation[]; updatedAt: number }
  }
  files: {
    key: string // docId
    value: { id: string; blob: Blob }
  }
}

const DB_NAME = 'drive-pdf-reader'
const DB_VERSION = 3

let dbPromise: Promise<IDBPDatabase<ReaderDB>> | null = null

function db(): Promise<IDBPDatabase<ReaderDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ReaderDB>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          const docs = database.createObjectStore('docs', { keyPath: 'id' })
          docs.createIndex('lastOpened', 'lastOpened')
          database.createObjectStore('annotations', { keyPath: 'docId' })
          database.createObjectStore('files', { keyPath: 'id' })
        }
        if (oldVersion < 2) {
          database.createObjectStore('bookmarks', { keyPath: 'docId' })
        }
        if (oldVersion < 3) {
          database.createObjectStore('inks', { keyPath: 'docId' })
          database.createObjectStore('texts', { keyPath: 'docId' })
        }
      },
    })
  }
  return dbPromise
}

// --- Docs (recent files) ----------------------------------------------------

export async function putDocMeta(meta: DocMeta): Promise<void> {
  await (await db()).put('docs', meta)
}

export async function getDocMeta(id: string): Promise<DocMeta | undefined> {
  return (await db()).get('docs', id)
}

export async function listRecentDocs(limit = 20): Promise<DocMeta[]> {
  const all = await (await db()).getAllFromIndex('docs', 'lastOpened')
  return all.reverse().slice(0, limit)
}

export async function deleteDoc(id: string): Promise<void> {
  const conn = await db()
  await Promise.all([
    conn.delete('docs', id),
    conn.delete('annotations', id),
    conn.delete('bookmarks', id),
    conn.delete('inks', id),
    conn.delete('texts', id),
    conn.delete('files', id),
  ])
}

// --- Annotations ------------------------------------------------------------

export async function getLocalAnnotations(docId: string): Promise<Annotation[]> {
  const rec = await (await db()).get('annotations', docId)
  return rec?.list ?? []
}

export async function putLocalAnnotations(
  docId: string,
  list: Annotation[],
): Promise<void> {
  await (await db()).put('annotations', { docId, list, updatedAt: Date.now() })
}

export async function getLocalBookmarks(docId: string): Promise<Bookmark[]> {
  const rec = await (await db()).get('bookmarks', docId)
  return rec?.list ?? []
}

export async function putLocalBookmarks(docId: string, list: Bookmark[]): Promise<void> {
  await (await db()).put('bookmarks', { docId, list, updatedAt: Date.now() })
}

export async function getLocalInks(docId: string): Promise<InkAnnotation[]> {
  const rec = await (await db()).get('inks', docId)
  return rec?.list ?? []
}

export async function putLocalInks(docId: string, list: InkAnnotation[]): Promise<void> {
  await (await db()).put('inks', { docId, list, updatedAt: Date.now() })
}

export async function getLocalTexts(docId: string): Promise<TextAnnotation[]> {
  const rec = await (await db()).get('texts', docId)
  return rec?.list ?? []
}

export async function putLocalTexts(docId: string, list: TextAnnotation[]): Promise<void> {
  await (await db()).put('texts', { docId, list, updatedAt: Date.now() })
}

// --- Cached local file blobs ------------------------------------------------

export async function cacheFileBlob(id: string, blob: Blob): Promise<void> {
  await (await db()).put('files', { id, blob })
}

export async function getCachedFileBlob(id: string): Promise<Blob | undefined> {
  const rec = await (await db()).get('files', id)
  return rec?.blob
}

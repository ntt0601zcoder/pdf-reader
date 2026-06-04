import type { SidecarFile } from '../../types'
import { SIDECAR_APP_PROPERTY_KEY } from '../../types'
import { authedFetch } from './auth'

// =============================================================================
// Google Drive REST v3 — frontend fetch with Bearer token. All operations work
// under the drive.file scope because we only touch Picker-opened PDFs and
// app-created sidecar files.
// =============================================================================

const DRIVE = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

/** All sidecars live in this app-created folder (keeps Drive root tidy). */
const APP_FOLDER_NAME = 'PDF Reader Notes'
let appFolderId: string | null = null

/**
 * Find or create the app's notes folder and return its id. Works under the
 * drive.file scope because the folder is created by the app (so files.list
 * sees it and we can create children inside it).
 */
async function ensureAppFolder(): Promise<string> {
  if (appFolderId) return appFolderId

  const q =
    `mimeType = 'application/vnd.google-apps.folder' ` +
    `and name = '${APP_FOLDER_NAME}' and trashed = false`
  const findUrl =
    `${DRIVE}/files?q=${encodeURIComponent(q)}` +
    `&fields=${encodeURIComponent('files(id,name)')}&spaces=drive`
  const found = await authedFetch(findUrl)
  if (found.ok) {
    const data = await found.json()
    if (data.files?.[0]?.id) {
      appFolderId = data.files[0].id as string
      return appFolderId
    }
  }

  const created = await authedFetch(`${DRIVE}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: APP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      appProperties: { pdfReaderKind: 'folder' },
    }),
  })
  if (!created.ok) {
    throw new Error(`Create folder failed: ${created.status} ${await safeText(created)}`)
  }
  appFolderId = (await created.json()).id as string
  return appFolderId
}

/** Download a PDF's raw bytes (must use alt=media, never gapi which corrupts binary). */
export async function downloadPdf(fileId: string): Promise<ArrayBuffer> {
  const res = await authedFetch(`${DRIVE}/files/${encodeURIComponent(fileId)}?alt=media`)
  if (!res.ok) {
    throw new Error(`Drive download failed: ${res.status} ${await safeText(res)}`)
  }
  return res.arrayBuffer()
}

/** Find an existing sidecar for a given source PDF, or null. */
export async function findSidecar(
  sourceFileId: string,
): Promise<{ id: string; name: string } | null> {
  const q =
    `appProperties has { key='${SIDECAR_APP_PROPERTY_KEY}' and value='${sourceFileId}' } ` +
    `and trashed = false`
  const url =
    `${DRIVE}/files?q=${encodeURIComponent(q)}` +
    `&fields=${encodeURIComponent('files(id,name,modifiedTime)')}` +
    `&spaces=drive`
  const res = await authedFetch(url)
  if (!res.ok) throw new Error(`Drive search failed: ${res.status} ${await safeText(res)}`)
  const data = await res.json()
  const f = data.files?.[0]
  return f ? { id: f.id, name: f.name } : null
}

/** Load + parse a sidecar JSON file by its Drive fileId. */
export async function loadSidecar(fileId: string): Promise<SidecarFile | null> {
  const res = await authedFetch(`${DRIVE}/files/${encodeURIComponent(fileId)}?alt=media`)
  if (!res.ok) throw new Error(`Sidecar load failed: ${res.status} ${await safeText(res)}`)
  try {
    return (await res.json()) as SidecarFile
  } catch {
    return null
  }
}

/** Create a new sidecar (multipart) linked to the source PDF; returns its fileId. */
export async function createSidecar(
  sourceFileId: string,
  fileName: string,
  sidecar: SidecarFile,
): Promise<string> {
  // Put the sidecar in the app folder; if that lookup fails (transient), fall
  // back to Drive root so a save is never lost.
  let parents: string[] | undefined
  try {
    parents = [await ensureAppFolder()]
  } catch {
    parents = undefined
  }

  const boundary = 'pdfreader_' + Math.random().toString(36).slice(2)
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelim = `\r\n--${boundary}--`

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    ...(parents ? { parents } : {}),
    appProperties: { [SIDECAR_APP_PROPERTY_KEY]: sourceFileId, pdfReaderKind: 'sidecar' },
  }

  const body = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata),
    delimiter,
    'Content-Type: application/json\r\n\r\n',
    JSON.stringify(sidecar),
    closeDelim,
  ])

  const res = await authedFetch(
    `${UPLOAD}/files?uploadType=multipart&fields=id`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  )
  if (!res.ok) throw new Error(`Sidecar create failed: ${res.status} ${await safeText(res)}`)
  const data = await res.json()
  return data.id as string
}

/**
 * Overwrite an existing sidecar's contents.
 * Returns false if the file no longer exists / isn't accessible (404) so the
 * caller can recreate it; throws on other errors.
 */
export async function updateSidecar(fileId: string, sidecar: SidecarFile): Promise<boolean> {
  const res = await authedFetch(
    `${UPLOAD}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sidecar),
    },
  )
  if (res.status === 404) return false // stale id — caller should recreate
  if (!res.ok) throw new Error(`Sidecar update failed: ${res.status} ${await safeText(res)}`)
  return true
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

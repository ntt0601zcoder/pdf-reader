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
  const boundary = 'pdfreader_' + Math.random().toString(36).slice(2)
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelim = `\r\n--${boundary}--`

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
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

/** Overwrite an existing sidecar's contents. */
export async function updateSidecar(fileId: string, sidecar: SidecarFile): Promise<void> {
  const res = await authedFetch(
    `${UPLOAD}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sidecar),
    },
  )
  if (!res.ok) throw new Error(`Sidecar update failed: ${res.status} ${await safeText(res)}`)
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

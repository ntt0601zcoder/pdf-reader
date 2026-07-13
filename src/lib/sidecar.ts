import type {
  Annotation,
  Bookmark,
  DocMeta,
  InkAnnotation,
  SidecarFile,
  TextAnnotation,
} from '../types'

// Pure transforms between the in-memory annotations and the persisted sidecar
// document (used for both Drive and import/export).

/** Everything a sidecar carries, in one payload. */
export interface SidecarPayload {
  annotations: Annotation[]
  bookmarks: Bookmark[]
  inks: InkAnnotation[]
  texts: TextAnnotation[]
  lastPage?: number
  lastPageAt?: number
}

export function buildSidecar(meta: DocMeta, p: SidecarPayload): SidecarFile {
  return {
    schema: 'drive-pdf-reader/annotations',
    version: 1,
    docName: meta.name,
    sourceFileId: meta.driveFileId,
    updatedAt: Date.now(),
    annotations: p.annotations,
    bookmarks: p.bookmarks,
    inks: p.inks,
    texts: p.texts,
    // Undefined values are dropped by JSON.stringify, so older readers are unaffected.
    lastPage: p.lastPage,
    lastPageAt: p.lastPageAt,
  }
}

export function readInks(sidecar: SidecarFile | null): InkAnnotation[] {
  if (!sidecar || sidecar.schema !== 'drive-pdf-reader/annotations') return []
  return Array.isArray(sidecar.inks) ? sidecar.inks : []
}

export function readTexts(sidecar: SidecarFile | null): TextAnnotation[] {
  if (!sidecar || sidecar.schema !== 'drive-pdf-reader/annotations') return []
  return Array.isArray(sidecar.texts) ? sidecar.texts : []
}

/** Read the synced reading position from a sidecar (if present). */
export function readLastPage(sidecar: SidecarFile | null): {
  lastPage?: number
  lastPageAt?: number
} {
  if (!sidecar || sidecar.schema !== 'drive-pdf-reader/annotations') return {}
  const lastPage = typeof sidecar.lastPage === 'number' ? sidecar.lastPage : undefined
  const lastPageAt = typeof sidecar.lastPageAt === 'number' ? sidecar.lastPageAt : undefined
  return { lastPage, lastPageAt }
}

export function readSidecar(sidecar: SidecarFile | null): Annotation[] {
  if (!sidecar || sidecar.schema !== 'drive-pdf-reader/annotations') return []
  return Array.isArray(sidecar.annotations) ? sidecar.annotations : []
}

export function readBookmarks(sidecar: SidecarFile | null): Bookmark[] {
  if (!sidecar || sidecar.schema !== 'drive-pdf-reader/annotations') return []
  return Array.isArray(sidecar.bookmarks) ? sidecar.bookmarks : []
}

/** Export all annotations + bookmarks to a Markdown document (sorted by page). */
export function exportMarkdown(
  meta: DocMeta,
  annotations: Annotation[],
  bookmarks: Bookmark[] = [],
): string {
  const lines: string[] = [`# ${meta.name}`, '']

  if (bookmarks.length) {
    lines.push('## Bookmarks', '')
    for (const b of [...bookmarks].sort((a, c) => a.page - c.page)) {
      lines.push(`- Trang ${b.page}${b.label ? ` — ${b.label}` : ''}`)
    }
    lines.push('')
  }

  const sorted = [...annotations].sort(
    (a, b) => a.page - b.page || a.rects[0]?.y - b.rects[0]?.y,
  )
  let lastPage = -1
  for (const a of sorted) {
    if (a.page !== lastPage) {
      lines.push(`## Trang ${a.page}`, '')
      lastPage = a.page
    }
    if (a.text) lines.push(`> ${a.text.replace(/\n+/g, ' ')}`)
    if (a.note) lines.push('', a.note)
    lines.push('')
  }
  return lines.join('\n')
}

/** Trigger a browser download of a text file. */
export function downloadTextFile(filename: string, content: string, mime = 'text/markdown') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

import type { Annotation, Bookmark, DocMeta, SidecarFile } from '../types'

// Pure transforms between the in-memory annotations/bookmarks and the persisted
// sidecar document (used for both Drive and import/export).

export function buildSidecar(
  meta: DocMeta,
  annotations: Annotation[],
  bookmarks: Bookmark[],
): SidecarFile {
  return {
    schema: 'drive-pdf-reader/annotations',
    version: 1,
    docName: meta.name,
    sourceFileId: meta.driveFileId,
    updatedAt: Date.now(),
    annotations,
    bookmarks,
  }
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

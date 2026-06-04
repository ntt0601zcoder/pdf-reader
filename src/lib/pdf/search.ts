import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import type { SearchMatch } from '../../types'

// =============================================================================
// Full-text search via a manual getTextContent() scan. We avoid pdf.js's
// PDFFindController (viewer-layer, version-volatile, gives no bounding boxes).
// Building our own offset map lets us match across TextItems and compute rects.
// =============================================================================

export interface TextItemLike {
  str: string
  transform: number[]
  width: number
  height: number
  hasEOL?: boolean
}

export interface ItemSpan {
  start: number
  end: number
  item: TextItemLike
}

export interface PageIndex {
  page: number
  text: string
  spans: ItemSpan[]
}

export interface MatchRect {
  /** 0..1 fractions of the page box (top-left origin). */
  x: number
  y: number
  width: number
  height: number
}

/** Build a per-page text index for the whole document (run once per doc). */
export async function buildSearchIndex(pdf: PDFDocumentProxy): Promise<PageIndex[]> {
  const pages: PageIndex[] = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n)
    const tc = await page.getTextContent()
    let text = ''
    const spans: ItemSpan[] = []
    for (const raw of tc.items) {
      const it = raw as TextItemLike
      if (typeof it.str !== 'string') continue
      const start = text.length
      text += it.str
      spans.push({ start, end: text.length, item: it })
      if (it.hasEOL) text += '\n'
    }
    pages.push({ page: n, text, spans })
  }
  return pages
}

function snippetAround(text: string, idx: number, len: number, pad = 40): string {
  const start = Math.max(0, idx - pad)
  const end = Math.min(text.length, idx + len + pad)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return (prefix + text.slice(start, end).replace(/\s+/g, ' ').trim() + suffix)
}

/** Search the index; returns flat matches with display snippets. */
export function searchInIndex(
  pages: PageIndex[],
  query: string,
  caseSensitive = false,
): SearchMatch[] {
  const q = query.trim()
  if (!q) return []
  const needle = caseSensitive ? q : q.toLowerCase()
  const out: SearchMatch[] = []
  for (const p of pages) {
    const hay = caseSensitive ? p.text : p.text.toLowerCase()
    let from = 0
    let idx = hay.indexOf(needle, from)
    while (idx !== -1) {
      out.push({
        page: p.page,
        index: idx,
        snippet: snippetAround(p.text, idx, needle.length),
      })
      from = idx + needle.length
      idx = hay.indexOf(needle, from)
    }
  }
  return out
}

/**
 * Compute the overlay rects (as 0..1 page fractions) for a single match on a
 * page. We re-scan that page's spans to find items overlapping [index, index+len)
 * and convert each item's PDF-space box to viewport fractions.
 */
export async function rectsForMatch(
  pdf: PDFDocumentProxy,
  pages: PageIndex[],
  match: SearchMatch,
  queryLen: number,
): Promise<MatchRect[]> {
  const p = pages.find((pg) => pg.page === match.page)
  if (!p) return []
  const page: PDFPageProxy = await pdf.getPage(match.page)
  const viewport = page.getViewport({ scale: 1, rotation: page.rotate })
  const { width: vw, height: vh } = viewport

  const end = match.index + queryLen
  const rects: MatchRect[] = []
  for (const span of p.spans) {
    if (span.start < end && span.end > match.index) {
      const it = span.item
      const e = it.transform[4]
      const f = it.transform[5]
      const vr = viewport.convertToViewportRectangle([e, f, e + it.width, f + it.height])
      const left = Math.min(vr[0], vr[2])
      const top = Math.min(vr[1], vr[3])
      const w = Math.abs(vr[2] - vr[0])
      const h = Math.abs(vr[3] - vr[1])
      rects.push({ x: left / vw, y: top / vh, width: w / vw, height: h / vh })
    }
  }
  return rects
}

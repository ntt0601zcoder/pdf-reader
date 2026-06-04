import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { TextItemLike } from './search'

// Per-document page-text cache (lighter than buildSearchIndex's offset map —
// text-to-speech only needs the reading string, not span geometry).
const cache = new Map<number, string>()
let cacheKey: PDFDocumentProxy | null = null

/** Extract a page's text as a single reading string (cached per document). */
export async function getPageText(pdf: PDFDocumentProxy, pageNumber: number): Promise<string> {
  if (cacheKey !== pdf) {
    cache.clear()
    cacheKey = pdf
  }
  const hit = cache.get(pageNumber)
  if (hit !== undefined) return hit

  const page = await pdf.getPage(pageNumber)
  const tc = await page.getTextContent()
  let text = ''
  for (const raw of tc.items) {
    const it = raw as TextItemLike
    if (typeof it.str !== 'string') continue
    text += it.str
    if (it.hasEOL) text += '\n'
    else if (!text.endsWith(' ')) text += ' '
  }
  const out = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
  cache.set(pageNumber, out)
  return out
}

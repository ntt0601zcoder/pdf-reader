import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { OutlineNode } from '../../types'

// =============================================================================
// Document outline (table of contents) via pdf.js getOutline().
// Resolves each bookmark's destination to a 1-based page number.
// =============================================================================

interface RawOutlineItem {
  title: string
  dest: string | unknown[] | null
  url?: string | null
  items?: RawOutlineItem[]
}

async function resolveDestToPage(
  pdf: PDFDocumentProxy,
  dest: string | unknown[] | null,
): Promise<number | undefined> {
  if (!dest) return undefined
  try {
    const explicit = typeof dest === 'string' ? await pdf.getDestination(dest) : dest
    if (!explicit || !explicit.length) return undefined
    const ref = explicit[0]
    if (ref == null) return undefined
    // getPageIndex returns a 0-based index for a ref.
    const index = await pdf.getPageIndex(ref as Parameters<PDFDocumentProxy['getPageIndex']>[0])
    return index + 1
  } catch {
    return undefined
  }
}

/** Build the resolved outline tree, or [] if the PDF has no bookmarks. */
export async function buildOutline(pdf: PDFDocumentProxy): Promise<OutlineNode[]> {
  const raw = (await pdf.getOutline()) as RawOutlineItem[] | null
  if (!raw || !raw.length) return []

  const walk = async (items: RawOutlineItem[]): Promise<OutlineNode[]> =>
    Promise.all(
      items.map(async (it) => ({
        title: it.title || '(untitled)',
        page: it.url ? undefined : await resolveDestToPage(pdf, it.dest),
        dest: it.dest ?? undefined,
        items: it.items?.length ? await walk(it.items) : [],
      })),
    )

  return walk(raw)
}

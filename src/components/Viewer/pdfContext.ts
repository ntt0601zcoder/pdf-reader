import { createContext, useContext } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

export interface PdfContextValue {
  pdf: PDFDocumentProxy | null
  /** Base page size at scale=1 (used to size placeholders for unrendered pages). */
  baseWidth: number
  baseHeight: number
}

export const PdfContext = createContext<PdfContextValue>({
  pdf: null,
  baseWidth: 612,
  baseHeight: 792,
})

export const usePdf = () => useContext(PdfContext)

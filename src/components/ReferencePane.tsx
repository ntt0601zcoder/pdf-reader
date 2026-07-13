import { useEffect, useRef, useState } from 'react'
import { Page } from 'react-pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useStore } from '../store/useStore'
import { useMessages } from '../hooks/useMessages'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { IconChevronLeft, IconChevronRight, IconClose } from './icons'

/**
 * A secondary "peek" pane: a continuous, scrollable view of the document beside
 * the reading page — e.g. keep the answer key open while working a test. It
 * reuses the already-parsed PDF proxy and is transient (never saved). The page
 * control jumps to a page; you can also just scroll.
 */
export function ReferencePane() {
  const refOpen = useStore((s) => s.refOpen)
  const refPage = useStore((s) => s.refPage)
  const setRefPage = useStore((s) => s.setRefPage)
  const closeRef = useStore((s) => s.closeRef)
  const numPages = useStore((s) => s.numPages)
  const pdfDoc = useStore((s) => s.pdfDoc)
  const m = useMessages()
  const narrow = useMediaQuery('(max-width: 760px)')
  const bodyRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [aspect, setAspect] = useState(1.414) // height / width, refined from page 1
  const [topPage, setTopPage] = useState(refPage)
  const [draft, setDraft] = useState(String(refPage))

  useEffect(() => setDraft(String(topPage)), [topPage])

  // Track the body width so pages fit the pane (and re-fit on resize).
  useEffect(() => {
    if (!refOpen) return
    const el = bodyRef.current
    if (!el) return
    const measure = () => setWidth(Math.max(0, el.clientWidth - 24))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [refOpen])

  // Page aspect ratio for placeholder sizing.
  useEffect(() => {
    if (!pdfDoc || !refOpen) return
    let cancelled = false
    pdfDoc
      .getPage(1)
      .then((p) => {
        const vp = p.getViewport({ scale: 1, rotation: p.rotate })
        if (!cancelled && vp.width > 0) setAspect(vp.height / vp.width)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [pdfDoc, refOpen])

  // Jump to refPage when it changes (page control) or once measured (on open).
  useEffect(() => {
    if (!refOpen || width <= 0) return
    const body = bodyRef.current
    const el = document.getElementById(`ref-page-${refPage}`)
    if (body && el) body.scrollTo({ top: Math.max(0, el.offsetTop - 8), behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refPage, width, refOpen])

  // Track the most-visible page for the page control.
  useEffect(() => {
    const body = bodyRef.current
    if (!refOpen || !body || numPages === 0) return
    const ratios = new Map<number, number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const n = Number((e.target as HTMLElement).dataset.page)
          if (e.isIntersecting && e.intersectionRatio > 0) ratios.set(n, e.intersectionRatio)
          else ratios.delete(n)
        }
        let best = -1
        let bestRatio = -1
        for (const [n, r] of ratios) {
          if (r > bestRatio || (r === bestRatio && (best === -1 || n < best))) {
            best = n
            bestRatio = r
          }
        }
        if (best !== -1) setTopPage(best)
      },
      { root: body, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    const els = body.querySelectorAll<HTMLElement>('.ref-page')
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // width is a dep because the .ref-page items only render once width > 0.
  }, [refOpen, numPages, width])

  if (!refOpen) return null
  const jump = (n: number) => setRefPage(Math.min(Math.max(1, n), numPages || 1))
  const commit = () => {
    const n = parseInt(draft, 10)
    if (!Number.isNaN(n)) jump(n)
    else setDraft(String(topPage))
  }

  return (
    <>
      {narrow && <div className="ref-pane__backdrop" onClick={closeRef} />}
      <aside className="ref-pane">
        <header className="ref-pane__header">
          <span className="ref-pane__title">{m.refPane}</span>
          <div className="ref-pane__nav">
            <button
              className="icon-btn"
              disabled={topPage <= 1}
              onClick={() => jump(topPage - 1)}
              title={m.prevPage}
            >
              <IconChevronLeft width={16} height={16} />
            </button>
            <input
              className="page-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commit()
                  e.currentTarget.blur()
                }
              }}
              aria-label={m.page}
            />
            <span className="page-total">/ {numPages || '—'}</span>
            <button
              className="icon-btn"
              disabled={topPage >= numPages}
              onClick={() => jump(topPage + 1)}
              title={m.nextPage}
            >
              <IconChevronRight width={16} height={16} />
            </button>
          </div>
          <button className="icon-btn" onClick={closeRef} aria-label={m.closeDoc}>
            <IconClose width={16} height={16} />
          </button>
        </header>
        <div className="ref-pane__body" ref={bodyRef}>
          {pdfDoc &&
            width > 0 &&
            Array.from({ length: numPages }, (_, i) => (
              <RefPage
                key={i + 1}
                pdf={pdfDoc}
                pageNumber={i + 1}
                width={width}
                height={width * aspect}
              />
            ))}
        </div>
      </aside>
    </>
  )
}

/** One lazily-rendered page in the reference pane's continuous scroll. */
function RefPage({
  pdf,
  pageNumber,
  width,
  height,
}: {
  pdf: PDFDocumentProxy
  pageNumber: number
  width: number
  height: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((e) => setVisible(e[0]?.isIntersecting ?? false), {
      root: el.closest('.ref-pane__body'),
      rootMargin: '800px 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      id={`ref-page-${pageNumber}`}
      data-page={pageNumber}
      className="ref-page"
      style={{ width, minHeight: height }}
    >
      {visible ? (
        <Page
          pdf={pdf}
          pageNumber={pageNumber}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      ) : (
        <span className="ref-page__num">{pageNumber}</span>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Page } from 'react-pdf'
import { useStore } from '../store/useStore'
import { useMessages } from '../hooks/useMessages'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { IconChevronLeft, IconChevronRight, IconClose } from './icons'

/**
 * A secondary "peek" pane showing an arbitrary page beside the reading page —
 * e.g. keep the answer key visible while working through a test. Transient:
 * it reuses the already-parsed PDF proxy and is never saved.
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
  const [draft, setDraft] = useState(String(refPage))

  useEffect(() => setDraft(String(refPage)), [refPage])

  // Track the body width so the page fits the pane (and re-fits on resize).
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

  if (!refOpen) return null
  const go = (n: number) => setRefPage(Math.min(Math.max(1, n), numPages || 1))
  const commit = () => {
    const n = parseInt(draft, 10)
    if (!Number.isNaN(n)) go(n)
    else setDraft(String(refPage))
  }
  const page = Math.min(Math.max(1, refPage), numPages || 1)

  return (
    <>
      {narrow && <div className="ref-pane__backdrop" onClick={closeRef} />}
      <aside className="ref-pane">
        <header className="ref-pane__header">
          <span className="ref-pane__title">{m.refPane}</span>
          <div className="ref-pane__nav">
            <button
              className="icon-btn"
              disabled={page <= 1}
              onClick={() => go(page - 1)}
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
              disabled={page >= numPages}
              onClick={() => go(page + 1)}
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
          {pdfDoc && width > 0 && (
            <Page
              pdf={pdfDoc}
              pageNumber={page}
              width={width}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={
                <div className="ref-pane__loading">
                  <div className="spinner" />
                </div>
              }
            />
          )}
        </div>
      </aside>
    </>
  )
}

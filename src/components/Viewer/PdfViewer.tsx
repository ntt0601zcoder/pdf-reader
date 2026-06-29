import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Document } from 'react-pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { pdfjs } from '../../lib/pdf/worker' // side-effect: configures worker + CSS
import { useStore } from '../../store/useStore'
import { reconcileReadingPosition } from '../../lib/storage'
import { useMessages } from '../../hooks/useMessages'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useAutoScroll } from '../../hooks/useAutoScroll'
import { buildOutline } from '../../lib/pdf/outline'
import { buildSearchIndex, rectsForMatch } from '../../lib/pdf/search'
import { PdfContext } from './pdfContext'
import { PdfPage } from './PdfPage'
import { ReadingRuler } from './ReadingRuler'

void pdfjs // ensure the worker module is retained

/**
 * The target top-Y (PDF user space) of a resolved link destination, for the
 * common destination types. Returns null when the destination carries no
 * specific position (Fit/FitB or unknown) — caller falls back to the page top.
 */
function destTopY(dest: unknown[]): number | null {
  const name = (dest[1] as { name?: string } | undefined)?.name
  if (name === 'XYZ') return typeof dest[3] === 'number' ? dest[3] : null
  if (name === 'FitH' || name === 'FitBH') return typeof dest[2] === 'number' ? dest[2] : null
  if (name === 'FitR') return typeof dest[5] === 'number' ? dest[5] : null // [ref,FitR,l,b,r,t]
  return null
}

export function PdfViewer() {
  const m = useMessages()
  const pdfData = useStore((s) => s.pdfData)
  const numPages = useStore((s) => s.numPages)
  const setNumPages = useStore((s) => s.setNumPages)
  const setOutline = useStore((s) => s.setOutline)
  const setDocError = useStore((s) => s.setDocError)
  const setCurrentPage = useStore((s) => s.setCurrentPage)
  const setSearching = useStore((s) => s.setSearching)
  const setPendingSelection = useStore((s) => s.setPendingSelection)
  const panel = useStore((s) => s.panel)
  const pendingScroll = useStore((s) => s.pendingScroll)
  const clearPendingScroll = useStore((s) => s.clearPendingScroll)
  const searchActiveIndex = useStore((s) => s.searchActiveIndex)
  const searchIndex = useStore((s) => s.searchIndex)
  const setSearchIndex = useStore((s) => s.setSearchIndex)
  const scale = useStore((s) => s.scale)
  const layout = useStore((s) => s.layout)
  const setLayout = useStore((s) => s.setLayout)
  const horizontal = layout === 'horizontal' // stays false for 'dual' — dual scrolls vertically
  const narrow = useMediaQuery('(max-width: 760px)')
  // Dual (two-up) would overflow a phone screen, so collapse it to single there.
  // data-layout uses this coerced value so the dual CSS never applies on phones.
  const effectiveLayout = narrow && layout === 'dual' ? 'vertical' : layout

  const viewerRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [base, setBase] = useState({ w: 612, h: 792 })

  useAutoScroll(viewerRef)

  // Scroll anchor (top-most visible page + fraction into it) so zoom doesn't
  // jump the view: page heights change with scale, so we re-pin after re-layout.
  const anchorRef = useRef<{ page: number; fraction: number }>({ page: 1, fraction: 0 })
  const prevScaleRef = useRef(scale)
  const rafRef = useRef(0)

  function updateAnchor() {
    const root = viewerRef.current
    if (!root) return
    const page = useStore.getState().currentPage
    const el = document.getElementById(`pdf-page-${page}`)
    if (!el) return
    const fraction = horizontal
      ? el.offsetWidth > 0
        ? (root.scrollLeft - el.offsetLeft) / el.offsetWidth
        : 0
      : el.offsetHeight > 0
        ? (root.scrollTop - el.offsetTop) / el.offsetHeight
        : 0
    anchorRef.current = { page, fraction: Math.min(1, Math.max(0, fraction)) }
  }

  // Re-pin the anchor after a scale change re-lays out the pages.
  useLayoutEffect(() => {
    const prev = prevScaleRef.current
    prevScaleRef.current = scale
    if (prev === scale) return // initial mount — nothing to restore
    const root = viewerRef.current
    if (!root) return
    const { page, fraction } = anchorRef.current
    const el = document.getElementById(`pdf-page-${page}`)
    if (!el) return
    if (horizontal) {
      root.scrollTo({ left: el.offsetLeft + fraction * el.offsetWidth, behavior: 'instant' as ScrollBehavior })
    } else {
      root.scrollTo({ top: el.offsetTop + fraction * el.offsetHeight, behavior: 'instant' as ScrollBehavior })
    }
  }, [scale, horizontal])

  // When the layout flips, keep the current page in view. Keyed on the
  // coerced layout so vertical↔dual (both horizontal===false) also re-centers.
  useEffect(() => {
    if (useStore.getState().numPages > 0) {
      useStore.getState().requestScroll(useStore.getState().currentPage)
    }
  }, [effectiveLayout])

  // Force single-page on phones: a persisted/desktop 'dual' falls back here.
  useEffect(() => {
    if (narrow && useStore.getState().layout === 'dual') setLayout('vertical')
  }, [narrow, setLayout])

  // Entering dual: a page should be ~half the container, so fit two-up. Runs in
  // a layout effect (after data-layout='dual' applies) so clientWidth is the
  // post-reflow size; the resulting setScale triggers the scale re-pin above.
  // Leaving dual restores the single-page scale captured on entry.
  const prevLayoutRef = useRef(layout)
  const preDualScaleRef = useRef<number | null>(null)
  useLayoutEffect(() => {
    const prev = prevLayoutRef.current
    prevLayoutRef.current = layout
    if (prev === layout) return
    if (prev === 'dual' && layout !== 'dual') {
      // Restore the single-page scale the user had before entering dual.
      if (preDualScaleRef.current != null) {
        useStore.getState().setScale(preDualScaleRef.current)
        preDualScaleRef.current = null
      }
      return
    }
    if (layout !== 'dual') return // only proceed when entering dual
    const root = viewerRef.current
    const page = root?.querySelector<HTMLElement>('.pdf-page')
    if (!root || !page) return
    const liveScale = useStore.getState().scale
    const natural = page.clientWidth / liveScale
    if (natural <= 0) return
    preDualScaleRef.current = liveScale // remember to restore on exit
    const gap = 24 // column-gap between the two pages of a spread
    const avail = (root.clientWidth - 48 - gap) / 2 // minus outer padding
    useStore.getState().setScale(avail / natural)
  }, [layout])

  // react-pdf reloads when `file` identity changes — memoize on the bytes.
  const file = useMemo(() => (pdfData ? { data: pdfData } : null), [pdfData])

  // Reset the document proxy when a new document loads (store resets the rest).
  useEffect(() => {
    setPdf(null)
    useStore.getState().setPdfDoc(null)
  }, [pdfData])

  async function onLoadSuccess(doc: PDFDocumentProxy) {
    setPdf(doc)
    useStore.getState().setPdfDoc(doc) // exposes the proxy for read-aloud
    setNumPages(doc.numPages)
    // Apply a deferred cross-device page jump now that numPages is known (no-op
    // when the jump already ran or nothing is pending).
    reconcileReadingPosition()
    // Restore the last-read page now that the page elements will exist. The
    // pendingScroll set during openDoc fired before any page was mounted, so we
    // re-request it here once numPages is known.
    const target = useStore.getState().currentPage
    if (target > 1 && target <= doc.numPages) {
      useStore.getState().requestScroll(target)
    }
    try {
      const p1 = await doc.getPage(1)
      const vp = p1.getViewport({ scale: 1, rotation: p1.rotate })
      setBase({ w: vp.width, h: vp.height })
      // On phones, fit the page to the screen width instead of the desktop 130%.
      const root = viewerRef.current
      if (narrow && root && vp.width > 0) {
        useStore.getState().setScale((root.clientWidth - 16) / vp.width)
      }
    } catch {
      /* keep defaults */
    }
    buildOutline(doc).then(setOutline).catch(() => setOutline([]))
  }

  // Build the (heavy) full-text index lazily, the first time Search opens.
  useEffect(() => {
    if (panel !== 'search' || !pdf || searchIndex.length > 0) return
    let cancelled = false
    setSearching(true)
    buildSearchIndex(pdf)
      .then((idx) => {
        if (!cancelled) setSearchIndex(idx)
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [panel, pdf, searchIndex.length, setSearching])

  // Pinch-to-zoom (two fingers). Non-passive so we can preventDefault the
  // browser's own page zoom while pinching inside the viewer.
  useEffect(() => {
    const root = viewerRef.current
    if (!root) return
    let startDist = 0
    let startScale = 1
    const dist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = dist(e.touches)
        startScale = useStore.getState().scale
      }
    }
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault()
        useStore.getState().setScale((startScale * dist(e.touches)) / startDist)
      }
    }
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) startDist = 0
    }
    root.addEventListener('touchstart', onStart, { passive: false })
    root.addEventListener('touchmove', onMove, { passive: false })
    root.addEventListener('touchend', onEnd)
    return () => {
      root.removeEventListener('touchstart', onStart)
      root.removeEventListener('touchmove', onMove)
      root.removeEventListener('touchend', onEnd)
    }
  }, [])

  // Track the current page via a single IntersectionObserver over all pages.
  useEffect(() => {
    const root = viewerRef.current
    if (!root || numPages === 0) return
    // Track how much of each page is visible; the "current" page is the most
    // visible one (works for vertical scroll and horizontal/centered paging).
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
        if (best !== -1) setCurrentPage(best)
      },
      { root, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    )
    const els = root.querySelectorAll<HTMLElement>('.pdf-page')
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [numPages, setCurrentPage])

  // Honor scroll requests (page nav, outline, search, highlight jump).
  useEffect(() => {
    if (!pendingScroll) return
    const root = viewerRef.current
    const el = document.getElementById(`pdf-page-${pendingScroll.page}`)
    if (root && el) {
      if (horizontal) {
        root.scrollTo({
          left: Math.max(0, el.offsetLeft - 16),
          top: pendingScroll.y ? Math.max(0, pendingScroll.y - 60) : 0,
          behavior: 'smooth',
        })
      } else {
        root.scrollTo({ top: el.offsetTop + (pendingScroll.y ?? 0) - 60, behavior: 'smooth' })
      }
    }
    clearPendingScroll()
  }, [pendingScroll, clearPendingScroll, horizontal])

  // Scroll the active search match into view.
  useEffect(() => {
    const { searchMatches, searchQuery, requestScroll } = useStore.getState()
    if (searchActiveIndex < 0 || !pdf) return
    const match = searchMatches[searchActiveIndex]
    if (!match) return
    ;(async () => {
      const el = document.getElementById(`pdf-page-${match.page}`)
      let y = 0
      try {
        const rects = await rectsForMatch(pdf, searchIndex, match, searchQuery.trim().length)
        if (rects[0] && el) y = rects[0].y * el.clientHeight
      } catch {
        /* fall back to page top */
      }
      requestScroll(match.page, Math.max(0, y - 80))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchActiveIndex, pdf, searchIndex])

  // An in-document link was clicked (cross-reference, "see page N", figure ref).
  // Remember where we were so the back button can return here, then jump — to the
  // link's precise target when the destination carries a Y, else the page top.
  async function onItemClick({ pageNumber, dest }: { pageNumber: number; dest?: unknown }) {
    if (!pageNumber) return
    const root = viewerRef.current
    const cur = useStore.getState().currentPage
    let backY: number | undefined
    if (root) {
      const el = document.getElementById(`pdf-page-${cur}`)
      if (el) backY = Math.max(0, root.scrollTop - el.offsetTop)
    }

    // Resolve the destination's in-page Y (PDF user space → display px) so a
    // cross-reference lands on the actual target, not the top of the page.
    let targetY: number | undefined
    if (pdf && Array.isArray(dest)) {
      const top = destTopY(dest)
      if (top != null) {
        try {
          const page = await pdf.getPage(pageNumber)
          const vp = page.getViewport({ scale: 1, rotation: page.rotate })
          const [, vy] = vp.convertToViewportPoint(0, top)
          targetY = Math.max(0, vy * useStore.getState().scale)
        } catch {
          /* fall back to page top */
        }
      }
    }

    // Same page with no specific target: nothing meaningful to navigate to.
    if (pageNumber === cur && targetY == null) return

    useStore.getState().pushNav({ page: cur, y: backY })
    useStore.getState().requestScroll(pageNumber, targetY)
  }

  const ctx = useMemo(
    () => ({ pdf, baseWidth: base.w, baseHeight: base.h }),
    [pdf, base.w, base.h],
  )

  if (!file) return null

  return (
    <div
      className="viewer"
      data-layout={effectiveLayout}
      ref={viewerRef}
      onScroll={() => {
        if (rafRef.current) return
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0
          updateAnchor()
        })
      }}
      onMouseDown={(e) => {
        // Clicking the background dismisses an open selection toolbar.
        if (!(e.target as HTMLElement).closest('.selection-toolbar')) {
          setPendingSelection(null)
        }
      }}
    >
      <ReadingRuler viewerRef={viewerRef} />
      <PdfContext.Provider value={ctx}>
        <Document
          file={file}
          onLoadSuccess={onLoadSuccess}
          onLoadError={(e) => setDocError(e?.message || 'errLoadPdf')}
          onItemClick={onItemClick}
          externalLinkTarget="_blank"
          externalLinkRel="noopener noreferrer"
          loading={<CenterSpinner label={m.loadingPdf} />}
          error={<div className="center-state">{m.errLoadPdf}</div>}
          noData={<span />}
        >
          <div className="viewer__pages">
            {Array.from({ length: numPages }, (_, i) => (
              <PdfPage key={i + 1} pageNumber={i + 1} />
            ))}
          </div>
        </Document>
      </PdfContext.Provider>
    </div>
  )
}

function CenterSpinner({ label }: { label: string }) {
  return (
    <div className="center-state">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  )
}

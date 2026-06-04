import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Page } from 'react-pdf'
import { useStore } from '../../store/useStore'
import { useMessages } from '../../hooks/useMessages'
import { captureSelection } from '../../lib/highlights'
import { usePdf } from './pdfContext'
import { HighlightLayer } from './HighlightLayer'
import { SearchLayer } from './SearchLayer'
import { SelectionToolbar } from './SelectionToolbar'
import { IconBookmarkFilled } from '../icons'

interface Props {
  pageNumber: number
}

/**
 * One page in the continuous scroll. Renders an empty placeholder until it is
 * near the viewport (IntersectionObserver), then the real canvas + text layer.
 * Highlights/search rects are positioned over it using the current display size.
 */
export function PdfPage({ pageNumber }: Props) {
  const m = useMessages()
  const { baseWidth, baseHeight } = usePdf()
  const scale = useStore((s) => s.scale)
  const setPendingSelection = useStore((s) => s.setPendingSelection)
  const setPanel = useStore((s) => s.setPanel)
  const pendingSelPage = useStore((s) => s.pendingSelection?.page)
  const isBookmarked = useStore((s) => s.bookmarks.some((b) => b.page === pageNumber))
  const toggleBookmark = useStore((s) => s.toggleBookmark)
  const layout = useStore((s) => s.layout)
  // NB: select the stable array, then derive — a selector that returns a fresh
  // array each call makes zustand v5 (useSyncExternalStore) loop infinitely.
  const annotations = useStore((s) => s.annotations)
  const pageAnnos = useMemo(
    () => annotations.filter((a) => a.page === pageNumber),
    [annotations, pageNumber],
  )

  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  // Intrinsic page size at scale=1; refined once the page actually renders.
  const [natural, setNatural] = useState({ w: baseWidth, h: baseHeight })

  // The canvas is rasterized at `renderScale`, which trails the live `scale`.
  // While zooming we CSS-transform the existing canvas (instant, no re-raster),
  // then re-rasterize once zooming settles — avoiding a white flash per step.
  const [renderScale, setRenderScale] = useState(scale)
  useEffect(() => {
    if (renderScale === scale) return
    const t = setTimeout(() => setRenderScale(scale), 200)
    return () => clearTimeout(t)
  }, [scale, renderScale])

  const dispW = natural.w * scale
  const dispH = natural.h * scale
  const zoom = scale / renderScale

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => setVisible(entries[0]?.isIntersecting ?? false),
      {
        root: el.closest('.viewer'),
        rootMargin: layout === 'horizontal' ? '0px 1400px' : '1400px 0px',
      },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [layout])

  function onMouseUp(e: ReactMouseEvent) {
    const el = ref.current
    if (!el) return

    // A selection can start on this page but be released over a sibling page
    // (dragging past the page gap). Resolve the page the selection STARTS on so
    // the highlight is never silently dropped onto the wrong/empty page.
    const sel = window.getSelection()
    let pageEl: HTMLElement = el
    if (sel && sel.rangeCount > 0) {
      const node = sel.getRangeAt(0).startContainer
      const start = (
        node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
      )?.closest<HTMLElement>('.pdf-page')
      if (start) pageEl = start
    }
    const targetPage = Number(pageEl.dataset.page) || pageNumber

    const cap = captureSelection(pageEl)
    if (cap) {
      setPendingSelection({ page: targetPage, text: cap.text, rects: cap.rects, anchor: cap.anchor })
      return
    }

    // No selection: treat as a click — open the note of any highlight under the
    // cursor (the highlight rects themselves are pointer-events:none so the text
    // layer stays selectable).
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const hit = pageAnnos.find((a) =>
      a.rects.some((r) => px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height),
    )
    if (hit) {
      setPanel('notes')
      setTimeout(() => {
        document
          .querySelector(`[data-note-id="${hit.id}"]`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 60)
    }
  }

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      data-page={pageNumber}
      ref={ref}
      className="pdf-page"
      style={{ width: dispW, height: dispH }}
      onMouseUp={onMouseUp}
    >
      {visible ? (
        <div
          className="pdf-page__inner"
          style={zoom !== 1 ? { transform: `scale(${zoom})`, transformOrigin: 'top left' } : undefined}
        >
          <Page
            pageNumber={pageNumber}
            scale={renderScale}
            renderTextLayer
            renderAnnotationLayer={false}
            onRenderSuccess={() => {
              const c = ref.current?.querySelector(
                '.react-pdf__Page__canvas',
              ) as HTMLCanvasElement | null
              if (c && c.clientWidth > 0) {
                setNatural({ w: c.clientWidth / renderScale, h: c.clientHeight / renderScale })
              }
            }}
            loading={
              <div
                className="pdf-page__placeholder"
                style={{ width: natural.w * renderScale, height: natural.h * renderScale }}
              />
            }
          />
        </div>
      ) : (
        <div className="pdf-page__placeholder" style={{ width: dispW, height: dispH }}>
          {pageNumber}
        </div>
      )}

      <HighlightLayer annotations={pageAnnos} pageWidth={dispW} pageHeight={dispH} />
      <SearchLayer page={pageNumber} pageWidth={dispW} pageHeight={dispH} />
      {pendingSelPage === pageNumber && <SelectionToolbar />}

      {isBookmarked && (
        <button
          className="page-bookmark-ribbon"
          title={m.removeBookmark}
          onClick={(e) => {
            e.stopPropagation()
            toggleBookmark(pageNumber)
          }}
        >
          <IconBookmarkFilled width={20} height={26} />
        </button>
      )}
    </div>
  )
}

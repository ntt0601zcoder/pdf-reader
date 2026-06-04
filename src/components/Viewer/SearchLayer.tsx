import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { rectsForMatch, type MatchRect } from '../../lib/pdf/search'
import { usePdf } from './pdfContext'

interface Props {
  page: number
  pageWidth: number
  pageHeight: number
}

interface Positioned {
  rects: MatchRect[]
  active: boolean
}

/** Overlays search-match rectangles for one page, emphasizing the active match. */
export function SearchLayer({ page, pageWidth, pageHeight }: Props) {
  const { pdf } = usePdf()
  const searchIndex = useStore((s) => s.searchIndex)
  const matches = useStore((s) => s.searchMatches)
  const activeIndex = useStore((s) => s.searchActiveIndex)
  const query = useStore((s) => s.searchQuery)
  const [positioned, setPositioned] = useState<Positioned[]>([])

  const pageMatches = matches.filter((m) => m.page === page)

  useEffect(() => {
    let cancelled = false
    if (!pdf || !query || pageMatches.length === 0 || pageWidth === 0) {
      setPositioned([])
      return
    }
    ;(async () => {
      const result: Positioned[] = []
      for (const m of pageMatches) {
        const rects = await rectsForMatch(pdf, searchIndex, m, query.trim().length)
        const globalIndex = matches.indexOf(m)
        result.push({ rects, active: globalIndex === activeIndex })
      }
      if (!cancelled) setPositioned(result)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, query, activeIndex, page, pageWidth, pageHeight, matches])

  if (positioned.length === 0) return null

  return (
    <div className="overlay-layer">
      {positioned.flatMap((p, pi) =>
        p.rects.map((r, ri) => (
          <div
            key={`${pi}_${ri}`}
            className={`search-rect${p.active ? ' is-active' : ''}`}
            style={{
              left: r.x * pageWidth,
              top: r.y * pageHeight,
              width: r.width * pageWidth,
              height: r.height * pageHeight,
            }}
          />
        )),
      )}
    </div>
  )
}

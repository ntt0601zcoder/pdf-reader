import { useEffect, useRef, useState, type RefObject } from 'react'
import { useStore } from '../../store/useStore'
import { useMediaQuery } from '../../hooks/useMediaQuery'

interface Props {
  viewerRef: RefObject<HTMLDivElement | null>
}

/**
 * Reading guide overlay: a clear horizontal band that follows the pointer's Y,
 * dimming everything above and below to aid line-by-line reading.
 *
 * It is pointer-events:none so text stays selectable/clickable, and it only
 * READS pointer coordinates (never writes the store on move, never
 * preventDefaults) so it cannot perturb the zoom re-pin, the most-visible-page
 * IntersectionObserver, or trigger a zustand render loop. The band Y is written
 * to a CSS var (not React state) so pointer moves cause zero re-renders.
 */
export function ReadingRuler({ viewerRef }: Props) {
  const rulerOn = useStore((s) => s.rulerOn) // stable boolean — safe selector
  const narrow = useMediaQuery('(max-width: 760px)')
  const rootRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const viewer = viewerRef.current
    const root = rootRef.current
    if (!rulerOn || !viewer || !root) return

    // On touch the finger sits on the line being read; lift the band above it.
    const touchLift = narrow ? 28 : 0

    const place = (clientY: number, fromTouch: boolean) => {
      const rect = viewer.getBoundingClientRect()
      const y = clientY - rect.top - (fromTouch ? touchLift : 0)
      root.style.setProperty('--ruler-y', `${y}px`)
      setActive(true) // no-ops when already true (React bails on equal state)
    }

    const onMouse = (e: MouseEvent) => {
      if (rafRef.current) return
      const cy = e.clientY
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0
        place(cy, false)
      })
    }
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length !== 1) return // let the pinch-zoom handler own multi-touch
      const cy = e.touches[0].clientY
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0
        place(cy, true)
      })
    }
    const onLeave = () => setActive(false)

    viewer.addEventListener('mousemove', onMouse, { passive: true })
    viewer.addEventListener('mouseleave', onLeave, { passive: true })
    viewer.addEventListener('touchstart', onTouch, { passive: true })
    viewer.addEventListener('touchmove', onTouch, { passive: true })
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      viewer.removeEventListener('mousemove', onMouse)
      viewer.removeEventListener('mouseleave', onLeave)
      viewer.removeEventListener('touchstart', onTouch)
      viewer.removeEventListener('touchmove', onTouch)
    }
  }, [rulerOn, narrow, viewerRef]) // NB: `active` intentionally excluded — listeners bind once

  if (!rulerOn) return null
  return (
    <div ref={rootRef} className="reading-ruler" data-active={active} aria-hidden="true">
      <div className="reading-ruler__bar reading-ruler__bar--top" />
      <div className="reading-ruler__band" />
      <div className="reading-ruler__bar reading-ruler__bar--bottom" />
    </div>
  )
}

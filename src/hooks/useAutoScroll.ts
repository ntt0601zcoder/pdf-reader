import { useEffect, type RefObject } from 'react'
import { useStore } from '../store/useStore'

/**
 * Continuously scrolls the viewer downward while `autoScroll` is on and the
 * layout scrolls vertically (vertical or dual). Lives in a hook (not the
 * PdfViewer body) and receives the existing viewerRef instead of querying the
 * DOM. The loop drives root.scrollTop directly; the viewer's own onScroll
 * handler keeps the zoom anchor in sync, and the most-visible-page observer
 * keeps advancing the current page — both unchanged.
 */
export function useAutoScroll(viewerRef: RefObject<HTMLDivElement | null>) {
  const autoScroll = useStore((s) => s.autoScroll)
  const layout = useStore((s) => s.layout)

  useEffect(() => {
    const root = viewerRef.current
    if (!root || !autoScroll || layout === 'horizontal') return

    // Neutralize CSS scroll-behavior:smooth so per-frame scrollTop increments
    // are instant (not animated). Restored on cleanup so page-nav stays smooth.
    const prevBehavior = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'

    let raf = 0
    let last = performance.now()
    const stop = () => useStore.getState().setAutoScroll(false)

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05) // clamp tab-refocus spikes
      last = now
      const px = useStore.getState().autoScrollSpeed * dt // live speed each frame
      const max = root.scrollHeight - root.clientHeight
      if (root.scrollTop >= max - 1) {
        stop()
        return
      }
      root.scrollTop = Math.min(root.scrollTop + px, max)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // Pause on explicit user intent — NOT via onScroll (the loop triggers that).
    // touchstart is passive so the non-passive pinch-zoom handler is unaffected.
    const onWheel = () => stop()
    const onTouch = () => stop()
    const onKey = (e: KeyboardEvent) => {
      // Don't treat typing in a form field as document navigation.
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      ) {
        return
      }
      if (['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        stop()
      }
    }
    root.addEventListener('wheel', onWheel, { passive: true })
    root.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(raf)
      root.style.scrollBehavior = prevBehavior
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('touchstart', onTouch)
      window.removeEventListener('keydown', onKey)
    }
    // speed read live inside tick, so it is intentionally NOT a dependency
    // (changing it should not tear down/rebuild the loop).
  }, [autoScroll, layout, viewerRef])
}

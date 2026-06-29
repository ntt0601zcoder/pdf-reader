import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { useMessages } from '../hooks/useMessages'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { IconBack, IconClose } from './icons'

const HOLD_MS = 1000 // total long-press duration to clear the stack
const HOLD_VISUAL_DELAY_MS = 250 // wait before showing the red/ring so a tap doesn't flash

/**
 * Floating "go back" control that appears after following an in-document link.
 * Tapping the pill pops the navigation stack one level (multi-level history).
 * Clearing the whole stack: a top-right × on desktop, or a 1-second long-press
 * on mobile — during which the pill turns red and a ring fills as confirmation.
 */
export function BackNavButton() {
  // Select the primitive length (stable) — never the array from a fresh selector.
  const depth = useStore((s) => s.navStack.length)
  const popNav = useStore((s) => s.popNav)
  const clearNav = useStore((s) => s.clearNav)
  const requestScroll = useStore((s) => s.requestScroll)
  const m = useMessages()
  const narrow = useMediaQuery('(max-width: 760px)')

  const [holding, setHolding] = useState(false)
  const visualTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showedHold = useRef(false) // true once the red/ring appeared (an aborted hold, not a tap)

  const cancelHold = () => {
    if (visualTimer.current) {
      clearTimeout(visualTimer.current)
      visualTimer.current = null
    }
    if (clearTimer.current) {
      clearTimeout(clearTimer.current)
      clearTimer.current = null
    }
    setHolding(false)
  }
  // Mobile only: hold to clear. The red/ring shows after a short delay (so quick
  // taps don't flash), and the ring fills over the remaining time.
  const startHold = () => {
    if (!narrow) return
    cancelHold()
    showedHold.current = false
    visualTimer.current = setTimeout(() => {
      showedHold.current = true
      setHolding(true)
    }, HOLD_VISUAL_DELAY_MS)
    clearTimer.current = setTimeout(() => {
      clearTimer.current = null
      clearNav() // depth -> 0 unmounts this button
    }, HOLD_MS)
  }
  useEffect(() => cancelHold, [])

  if (depth === 0) return null
  return (
    <div className="nav-back-fab">
      <button
        className={`nav-back-fab__main${holding ? ' is-holding' : ''}`}
        title={narrow ? m.navBackHoldHint : m.navBack}
        onClick={() => {
          // An aborted long-press (red/ring shown then released) is not a tap.
          if (showedHold.current) {
            showedHold.current = false
            return
          }
          const pos = popNav()
          if (pos) requestScroll(pos.page, pos.y)
        }}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
      >
        {holding ? (
          <>
            <span className="nav-back-fab__ring" aria-hidden="true">
              <svg viewBox="0 0 36 36">
                <circle className="nav-back-fab__ring-track" cx="18" cy="18" r="16" />
                <circle className="nav-back-fab__ring-fill" cx="18" cy="18" r="16" />
              </svg>
              <IconClose width={12} height={12} />
            </span>
            <span>{m.navClear}</span>
          </>
        ) : (
          <>
            <IconBack width={18} height={18} />
            <span>{m.navBack}</span>
            {depth > 1 && <span className="nav-back-fab__count">{depth}</span>}
          </>
        )}
      </button>
      {!narrow && (
        <button className="nav-back-fab__clear" title={m.navClear} onClick={clearNav}>
          <IconClose width={13} height={13} />
        </button>
      )}
    </div>
  )
}

import type { HighlightColor, NormRect } from '../types'

// =============================================================================
// Selection geometry. We turn a DOM text selection into rects expressed as
// 0..1 fractions of the page box, so highlights survive zoom changes.
// =============================================================================

export interface CapturedSelection {
  text: string
  rects: NormRect[]
  /** Anchor for the floating toolbar: px offsets within the page element. */
  anchor: { left: number; top: number }
}

/** CSS color for a highlight color key (resolves a theme variable). */
export function colorVar(color: HighlightColor): string {
  return `var(--hl-${color})`
}

/**
 * Capture the current selection relative to a page element. Returns null if
 * there is no usable selection inside this page.
 */
export function captureSelection(pageEl: HTMLElement): CapturedSelection | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null

  const text = sel.toString().trim()
  if (!text) return null

  const range = sel.getRangeAt(0)
  const pageRect = pageEl.getBoundingClientRect()
  const W = pageRect.width
  const H = pageRect.height
  if (W <= 0 || H <= 0) return null

  const clientRects = Array.from(range.getClientRects())
  const rects: NormRect[] = []
  let minLeft = Infinity
  let maxRight = -Infinity
  let minTop = Infinity

  for (const r of clientRects) {
    if (r.width <= 0.5 || r.height <= 0.5) continue
    // Keep only rects that actually fall on this page (selections can span pages).
    const cy = r.top + r.height / 2
    if (cy < pageRect.top - 2 || cy > pageRect.bottom + 2) continue

    const x = (r.left - pageRect.left) / W
    const y = (r.top - pageRect.top) / H
    const width = r.width / W
    const height = r.height / H
    rects.push({ x, y, width, height })

    minLeft = Math.min(minLeft, r.left)
    maxRight = Math.max(maxRight, r.right)
    minTop = Math.min(minTop, r.top)
  }

  if (!rects.length) return null

  return {
    text,
    rects: mergeRects(rects),
    anchor: {
      left: (minLeft + maxRight) / 2 - pageRect.left,
      top: minTop - pageRect.top,
    },
  }
}

/**
 * Merge rects that share roughly the same line (similar y/height and adjacent
 * x) to reduce the number of overlay divs the browser sometimes emits per line.
 */
function mergeRects(rects: NormRect[]): NormRect[] {
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x)
  const out: NormRect[] = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    if (
      last &&
      Math.abs(last.y - r.y) < 0.004 &&
      Math.abs(last.height - r.height) < 0.006 &&
      r.x <= last.x + last.width + 0.01
    ) {
      const right = Math.max(last.x + last.width, r.x + r.width)
      last.x = Math.min(last.x, r.x)
      last.width = right - last.x
      last.height = Math.max(last.height, r.height)
    } else {
      out.push({ ...r })
    }
  }
  return out
}

/** A small id generator (crypto.randomUUID with a fallback). */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'a' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

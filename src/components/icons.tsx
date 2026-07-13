import type { SVGProps } from 'react'

// Lightweight inline SVG icon set (stroke = currentColor).
type P = SVGProps<SVGSVGElement>

function base(props: P) {
  return {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  }
}

export const IconChevronLeft = (p: P) => (
  <svg {...base(p)}><path d="m15 18-6-6 6-6" /></svg>
)
export const IconChevronRight = (p: P) => (
  <svg {...base(p)}><path d="m9 18 6-6-6-6" /></svg>
)
export const IconZoomIn = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M11 8v6M8 11h6" /></svg>
)
export const IconZoomOut = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M8 11h6" /></svg>
)
export const IconFitWidth = (p: P) => (
  <svg {...base(p)}><path d="M3 12h18M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" /></svg>
)
export const IconPalette = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.7-.9 1.5-1.9-.3-1.3.7-2.1 1.9-2.1H17a4 4 0 0 0 4-4c0-5-4-10-9-10Z" />
    <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)
export const IconGlobe = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></svg>
)
export const IconList = (p: P) => (
  <svg {...base(p)}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
)
export const IconSearch = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
)
export const IconHighlighter = (p: P) => (
  <svg {...base(p)}><path d="m9 11 6 6M4 20l3-1 9-9-2-2-9 9-1 3ZM14 6l4 4 2-2a2 2 0 0 0 0-3l-1-1a2 2 0 0 0-3 0l-2 2Z" /></svg>
)
export const IconDrive = (p: P) => (
  <svg {...base(p)}><path d="M8 3h8l5 9-4 7H7l-4-7 5-9ZM3.5 12h17M8 3l4 9M16 3l-4 9" /></svg>
)
export const IconFile = (p: P) => (
  <svg {...base(p)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /></svg>
)
export const IconClose = (p: P) => (
  <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
)
export const IconTrash = (p: P) => (
  <svg {...base(p)}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14" /></svg>
)
export const IconEdit = (p: P) => (
  <svg {...base(p)}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>
)
export const IconCopy = (p: P) => (
  <svg {...base(p)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
)
export const IconNote = (p: P) => (
  <svg {...base(p)}><path d="M4 4h16v12l-4 4H4V4Z" /><path d="M16 20v-4h4M8 9h8M8 13h5" /></svg>
)
export const IconCheck = (p: P) => (
  <svg {...base(p)}><path d="M20 6 9 17l-5-5" /></svg>
)
export const IconDownload = (p: P) => (
  <svg {...base(p)}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
)
export const IconBook = (p: P) => (
  <svg {...base(p)}><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Z" /><path d="M4 19a2 2 0 0 0 2 2h12" /></svg>
)
export const IconLayoutVertical = (p: P) => (
  <svg {...base(p)}><rect x="6" y="3" width="12" height="8" rx="1.5" /><rect x="6" y="13" width="12" height="8" rx="1.5" /></svg>
)
export const IconLayoutHorizontal = (p: P) => (
  <svg {...base(p)}><rect x="3" y="6" width="8" height="12" rx="1.5" /><rect x="13" y="6" width="8" height="12" rx="1.5" /></svg>
)
export const IconLayoutDual = (p: P) => (
  <svg {...base(p)}><rect x="3" y="5" width="8" height="14" rx="1.5" /><rect x="13" y="5" width="8" height="14" rx="1.5" /><path d="M12 5v14" /></svg>
)
export const IconPlay = (p: P) => (
  <svg {...base(p)}><path d="M7 4v16l13-8L7 4Z" fill="currentColor" stroke="none" /></svg>
)
export const IconPause = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><rect x="7" y="4" width="4" height="16" rx="1" /><rect x="13" y="4" width="4" height="16" rx="1" /></svg>
)
export const IconStop = (p: P) => (
  <svg {...base(p)}><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke="none" /></svg>
)
export const IconSpeaker = (p: P) => (
  <svg {...base(p)}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16 8a4 4 0 0 1 0 8M18.5 5.5a8 8 0 0 1 0 13" /></svg>
)
export const IconMore = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" /></svg>
)
export const IconBrightness = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
)
export const IconBack = (p: P) => (
  <svg {...base(p)}><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>
)
export const IconPen = (p: P) => (
  <svg {...base(p)}><path d="M4 20l4-1L19 8l-3-3L5 16l-1 4Z" /><path d="M14 7l3 3" /></svg>
)
export const IconTextBox = (p: P) => (
  <svg {...base(p)}><path d="M6 5h12M12 5v14M9 19h6" /></svg>
)
export const IconEraser = (p: P) => (
  <svg {...base(p)}><path d="M4 15.5 11 8.5l6 6-4.5 4.5H8l-4-4a1 1 0 0 1 0-1.5Z" /><path d="M21 19H10M11 8.5 16 3.5" /></svg>
)
export const IconUndo = (p: P) => (
  <svg {...base(p)}><path d="M3 7v6h6" /><path d="M3.5 13a9 9 0 1 0 2.5-6.3L3 9.5" /></svg>
)
export const IconStar = (p: P) => (
  <svg {...base(p)} fill="currentColor"><path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 18.6l-5.8 3.1 1.1-6.4L2.6 9.8l6.5-.9L12 3Z" /></svg>
)
export const IconBookmark = (p: P) => (
  <svg {...base(p)}><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" /></svg>
)
export const IconRuler = (p: P) => (
  <svg {...base(p)}><rect x="3" y="8" width="18" height="8" rx="1" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></svg>
)
export const IconBookmarkFilled = (p: P) => (
  <svg {...base(p)} fill="currentColor"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" /></svg>
)

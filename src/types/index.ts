// =============================================================================
// Domain types — the shared contract used across store, storage and UI.
// =============================================================================

export type ThemeName =
  | 'light'
  | 'gray'
  | 'sepia'
  | 'solarized-light'
  | 'dark'
  | 'dim'
  | 'night'
  | 'black'
  | 'contrast'
  | 'one-dark'
  | 'dracula'
  | 'nord'
  | 'gruvbox'
  | 'monokai'
  | 'solarized-dark'

/** All theme keys (used to validate the persisted/initial theme). */
export const THEMES: ThemeName[] = [
  'light',
  'gray',
  'sepia',
  'solarized-light',
  'dark',
  'dim',
  'night',
  'black',
  'contrast',
  'one-dark',
  'dracula',
  'nord',
  'gruvbox',
  'monokai',
  'solarized-dark',
]
export type Lang = 'vi' | 'en'

/** Read-aloud (text-to-speech) playback state. */
export type TtsState = 'idle' | 'playing' | 'paused'

/** Where the currently open PDF came from. */
export type DocSource = 'drive' | 'local'

/** Available highlight colors (keys map to CSS values in theme.css). */
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange'

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  'yellow',
  'green',
  'blue',
  'pink',
  'orange',
]

/**
 * A rectangle expressed as FRACTIONS (0..1) of the page box, with the origin
 * at the page's top-left. Storing ratios (not pixels) means highlights survive
 * any zoom change: on render we just multiply by the current page pixel size.
 */
export interface NormRect {
  /** Left edge, 0..1 of page width. */
  x: number
  /** Top edge, 0..1 of page height. */
  y: number
  /** Width, 0..1 of page width. */
  width: number
  /** Height, 0..1 of page height. */
  height: number
}

/** A highlight (optionally carrying a note) anchored to a single page. */
export interface Annotation {
  id: string
  /** 1-based page number. */
  page: number
  color: HighlightColor
  /** The selected text (used for the notes list + export + search). */
  text: string
  /** Optional free-form note attached to this highlight. */
  note?: string
  /** Rects in PDF user space (scale = 1). */
  rects: NormRect[]
  createdAt: number
  updatedAt: number
}

/** A point normalized to the page box (0..1), so drawings survive zoom. */
export interface NormPoint {
  x: number
  y: number
}

/** Absolute pen/text colors (not theme vars) — ink stays the drawn color. */
export const INK_COLORS: string[] = [
  '#e5484d',
  '#111827',
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#ffffff',
]

/** Ink widths as a fraction of page width. */
export const INK_WIDTHS: number[] = [0.0025, 0.0045, 0.008]
/** Text sizes as a fraction of page height. */
export const TEXT_SIZES: number[] = [0.016, 0.024, 0.034]

/** A freehand ink stroke drawn over a page (works on scanned PDFs). */
export interface InkAnnotation {
  id: string
  /** 1-based page number. */
  page: number
  /** Absolute color (hex). */
  color: string
  /** Stroke width as a fraction of page width. */
  width: number
  /** Path points as 0..1 fractions of the page box. */
  points: NormPoint[]
  createdAt: number
}

/** A free-form text box typed onto a page. */
export interface TextAnnotation {
  id: string
  /** 1-based page number. */
  page: number
  /** Top-left position as 0..1 fractions of the page box. */
  x: number
  y: number
  text: string
  color: string
  /** Font size as a fraction of page height. */
  size: number
  createdAt: number
  updatedAt: number
}

/** A page-level bookmark (a saved place to return to), with an optional label. */
export interface Bookmark {
  id: string
  /** 1-based page number. */
  page: number
  label?: string
  createdAt: number
}

/**
 * Identity + metadata for a document the user has opened.
 * `id` is stable: for Drive files it is the Drive fileId; for local files it is
 * a fingerprint derived from name + size + lastModified.
 */
export interface DocMeta {
  id: string
  source: DocSource
  name: string
  /** Drive fileId of the source PDF (drive docs only). */
  driveFileId?: string
  /** Drive fileId of the sidecar annotations JSON, once created (drive only). */
  sidecarFileId?: string
  size?: number
  /** Page the user was last on (1-based) — restored on reopen. */
  lastPage?: number
  /** Epoch ms when lastPage was set (used to reconcile local vs Drive). */
  lastPageAt?: number
  lastOpened: number
}

/** The on-disk / in-Drive sidecar document format (versioned for migrations). */
export interface SidecarFile {
  schema: 'drive-pdf-reader/annotations'
  version: 1
  docName: string
  sourceFileId?: string
  updatedAt: number
  annotations: Annotation[]
  /** Optional for backward-compat with sidecars written before bookmarks. */
  bookmarks?: Bookmark[]
  /** Freehand ink + typed text drawn over pages (scanned-PDF friendly). */
  inks?: InkAnnotation[]
  texts?: TextAnnotation[]
  /** Last-read page (1-based), synced across devices via Drive. */
  lastPage?: number
  /** Epoch ms when lastPage was written (newest wins when reconciling). */
  lastPageAt?: number
}

/** A flattened search hit used by the search panel. */
export interface SearchMatch {
  page: number
  /** Index of the match within the page. */
  index: number
  /** Snippet of surrounding text for display. */
  snippet: string
}

/** A node in the document outline (table of contents). */
export interface OutlineNode {
  title: string
  /** Resolved 1-based page number (may be undefined if it can't be resolved). */
  page?: number
  /** Raw pdf.js destination, resolved lazily on click if `page` is absent. */
  dest?: unknown
  items: OutlineNode[]
}

export const SIDECAR_APP_PROPERTY_KEY = 'pdfReaderSource'
export const SIDECAR_NAME_SUFFIX = '.pdfnotes.json'

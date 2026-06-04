import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Annotation,
  Bookmark,
  DocMeta,
  HighlightColor,
  Lang,
  NormRect,
  OutlineNode,
  SearchMatch,
  ThemeName,
} from '../types'
import { THEMES } from '../types'
import { newId } from '../lib/highlights'
import type { PageIndex } from '../lib/pdf/search'
import { detectLang } from '../i18n'

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'local' | 'error'
export type PanelKind = 'outline' | 'search' | 'notes' | 'bookmarks' | null
/** Page layout: continuous vertical scroll, horizontal page-by-page swipe, or two-up book spread. */
export type PageLayout = 'vertical' | 'horizontal' | 'dual'

/** A text selection awaiting a user action (highlight / note / copy). */
export interface PendingSelection {
  page: number
  text: string
  rects: NormRect[]
  /** Viewport position to anchor the floating toolbar (page-relative px). */
  anchor: { left: number; top: number }
}

interface ReaderState {
  // --- settings (persisted) ------------------------------------------------
  theme: ThemeName
  lang: Lang
  defaultColor: HighlightColor
  layout: PageLayout
  /** Night-reading dim: opacity (0..0.7) of a black overlay over the reader. */
  dimLevel: number
  /** Reading-ruler focus band (dims everything but the line under the pointer). */
  rulerOn: boolean
  setTheme: (t: ThemeName) => void
  setLang: (l: Lang) => void
  toggleLang: () => void
  setDefaultColor: (c: HighlightColor) => void
  setLayout: (l: PageLayout) => void
  /** Cycle vertical → horizontal → dual → vertical. */
  cycleLayout: () => void
  setDimLevel: (n: number) => void
  setRulerOn: (v: boolean) => void
  toggleRuler: () => void

  // --- auth ---------------------------------------------------------------
  accessToken: string | null
  tokenExpiresAt: number | null
  userEmail: string | null
  setToken: (token: string, expiresInSec: number) => void
  clearToken: () => void
  setUserEmail: (email: string | null) => void

  // --- current document ---------------------------------------------------
  doc: DocMeta | null
  pdfData: Uint8Array | null
  numPages: number
  docLoading: boolean
  docError: string | null
  openDoc: (meta: DocMeta, bytes: Uint8Array) => void
  closeDoc: () => void
  setNumPages: (n: number) => void
  setDocLoading: (v: boolean) => void
  setDocError: (msg: string | null) => void

  // --- viewer -------------------------------------------------------------
  scale: number
  currentPage: number
  /** When set, the viewer scrolls to this page (and optional y), then clears. */
  pendingScroll: { page: number; y?: number } | null
  setScale: (s: number) => void
  zoomIn: () => void
  zoomOut: () => void
  setCurrentPage: (p: number) => void
  requestScroll: (page: number, y?: number) => void
  clearPendingScroll: () => void

  // --- auto-scroll --------------------------------------------------------
  autoScroll: boolean
  autoScrollSpeed: number // pixels per second
  setAutoScroll: (v: boolean) => void
  toggleAutoScroll: () => void
  setAutoScrollSpeed: (s: number) => void

  // --- annotations --------------------------------------------------------
  annotations: Annotation[]
  setAnnotations: (list: Annotation[]) => void
  addAnnotation: (a: Annotation) => void
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void
  removeAnnotation: (id: string) => void

  // --- bookmarks ----------------------------------------------------------
  bookmarks: Bookmark[]
  setBookmarks: (list: Bookmark[]) => void
  /** Add a bookmark for the page if absent, otherwise remove it. */
  toggleBookmark: (page: number) => void
  removeBookmark: (id: string) => void
  updateBookmark: (id: string, patch: Partial<Bookmark>) => void

  // --- outline ------------------------------------------------------------
  outline: OutlineNode[]
  setOutline: (o: OutlineNode[]) => void

  // --- search -------------------------------------------------------------
  searchQuery: string
  searchMatches: SearchMatch[]
  searchActiveIndex: number
  searching: boolean
  searchIndex: PageIndex[]
  setSearchQuery: (q: string) => void
  setSearchResults: (matches: SearchMatch[]) => void
  setSearchActiveIndex: (i: number) => void
  setSearching: (v: boolean) => void
  setSearchIndex: (idx: PageIndex[]) => void

  // --- UI -----------------------------------------------------------------
  panel: PanelKind
  togglePanel: (p: Exclude<PanelKind, null>) => void
  setPanel: (p: PanelKind) => void
  syncStatus: SyncStatus
  setSyncStatus: (s: SyncStatus) => void
  pendingSelection: PendingSelection | null
  setPendingSelection: (s: PendingSelection | null) => void
  /** Annotation whose note should open in edit mode in the notes panel. */
  editingNoteId: string | null
  setEditingNoteId: (id: string | null) => void
}

const MIN_SCALE = 0.4
const MAX_SCALE = 4
const SCALE_STEP = 0.2
const MIN_AUTOSCROLL = 10 // px/sec
const MAX_AUTOSCROLL = 400 // px/sec
/** Step for the auto-scroll speed +/- controls. */
export const AUTOSCROLL_STEP = 20

export const useStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      // settings
      theme: initialTheme(),
      lang: detectLang(),
      defaultColor: 'yellow',
      layout: 'vertical',
      dimLevel: 0,
      rulerOn: false,
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      toggleLang: () => set({ lang: get().lang === 'vi' ? 'en' : 'vi' }),
      setDefaultColor: (defaultColor) => set({ defaultColor }),
      setLayout: (layout) =>
        // Auto-scroll is for vertical/dual only; stop it when switching to horizontal.
        set({ layout, autoScroll: layout === 'horizontal' ? false : get().autoScroll }),
      cycleLayout: () =>
        set((s) => ({
          layout:
            s.layout === 'vertical'
              ? 'horizontal'
              : s.layout === 'horizontal'
                ? 'dual'
                : 'vertical',
        })),
      setDimLevel: (n) => set({ dimLevel: clamp(n, 0, 0.7) }),
      setRulerOn: (rulerOn) => set({ rulerOn }),
      toggleRuler: () => set({ rulerOn: !get().rulerOn }),

      // auth
      accessToken: null,
      tokenExpiresAt: null,
      userEmail: null,
      setToken: (token, expiresInSec) =>
        set({ accessToken: token, tokenExpiresAt: Date.now() + expiresInSec * 1000 }),
      clearToken: () => set({ accessToken: null, tokenExpiresAt: null, userEmail: null }),
      setUserEmail: (userEmail) => set({ userEmail }),

      // document
      doc: null,
      pdfData: null,
      numPages: 0,
      docLoading: false,
      docError: null,
      openDoc: (meta, bytes) =>
        set({
          doc: meta,
          pdfData: bytes,
          docError: null,
          docLoading: false,
          numPages: 0,
          annotations: [],
          bookmarks: [],
          outline: [],
          searchQuery: '',
          searchMatches: [],
          searchActiveIndex: -1,
          searchIndex: [],
          currentPage: meta.lastPage ?? 1,
          pendingScroll: meta.lastPage && meta.lastPage > 1 ? { page: meta.lastPage } : null,
        }),
      closeDoc: () =>
        set({
          doc: null,
          pdfData: null,
          numPages: 0,
          annotations: [],
          bookmarks: [],
          outline: [],
          docError: null,
          panel: null,
          currentPage: 1,
          searchQuery: '',
          searchMatches: [],
          searchActiveIndex: -1,
          searchIndex: [],
          pendingSelection: null,
          autoScroll: false,
        }),
      setNumPages: (numPages) => set({ numPages }),
      setDocLoading: (docLoading) => set({ docLoading }),
      setDocError: (docError) => set({ docError, docLoading: false }),

      // viewer
      scale: 1.3,
      currentPage: 1,
      pendingScroll: null,
      setScale: (scale) => set({ scale: clamp(scale, MIN_SCALE, MAX_SCALE) }),
      zoomIn: () => set({ scale: clamp(get().scale + SCALE_STEP, MIN_SCALE, MAX_SCALE) }),
      zoomOut: () => set({ scale: clamp(get().scale - SCALE_STEP, MIN_SCALE, MAX_SCALE) }),
      setCurrentPage: (currentPage) => set({ currentPage }),
      requestScroll: (page, y) => set({ pendingScroll: { page, y } }),
      clearPendingScroll: () => set({ pendingScroll: null }),

      // auto-scroll
      autoScroll: false,
      autoScrollSpeed: 60,
      setAutoScroll: (autoScroll) => set({ autoScroll }),
      toggleAutoScroll: () => set({ autoScroll: !get().autoScroll }),
      setAutoScrollSpeed: (s) =>
        set({ autoScrollSpeed: clamp(s, MIN_AUTOSCROLL, MAX_AUTOSCROLL) }),

      // annotations
      annotations: [],
      setAnnotations: (annotations) => set({ annotations }),
      addAnnotation: (a) => set({ annotations: [...get().annotations, a] }),
      updateAnnotation: (id, patch) =>
        set({
          annotations: get().annotations.map((a) =>
            a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a,
          ),
        }),
      removeAnnotation: (id) =>
        set({ annotations: get().annotations.filter((a) => a.id !== id) }),

      // bookmarks
      bookmarks: [],
      setBookmarks: (bookmarks) => set({ bookmarks }),
      toggleBookmark: (page) => {
        const existing = get().bookmarks.find((b) => b.page === page)
        if (existing) {
          set({ bookmarks: get().bookmarks.filter((b) => b.id !== existing.id) })
        } else {
          set({
            bookmarks: [...get().bookmarks, { id: newId(), page, createdAt: Date.now() }],
          })
        }
      },
      removeBookmark: (id) =>
        set({ bookmarks: get().bookmarks.filter((b) => b.id !== id) }),
      updateBookmark: (id, patch) =>
        set({
          bookmarks: get().bookmarks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        }),

      // outline
      outline: [],
      setOutline: (outline) => set({ outline }),

      // search
      searchQuery: '',
      searchMatches: [],
      searchActiveIndex: -1,
      searching: false,
      searchIndex: [],
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSearchResults: (searchMatches) => set({ searchMatches, searchActiveIndex: searchMatches.length ? 0 : -1 }),
      setSearchActiveIndex: (searchActiveIndex) => set({ searchActiveIndex }),
      setSearching: (searching) => set({ searching }),
      setSearchIndex: (searchIndex) => set({ searchIndex }),

      // UI
      panel: null,
      togglePanel: (p) => set({ panel: get().panel === p ? null : p }),
      setPanel: (panel) => set({ panel }),
      syncStatus: 'idle',
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      pendingSelection: null,
      setPendingSelection: (pendingSelection) => set({ pendingSelection }),
      editingNoteId: null,
      setEditingNoteId: (editingNoteId) => set({ editingNoteId }),
    }),
    {
      name: 'drive-pdf-reader/settings',
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences — never document data or tokens.
      partialize: (s) => ({
        theme: s.theme,
        lang: s.lang,
        defaultColor: s.defaultColor,
        layout: s.layout,
        dimLevel: s.dimLevel,
        rulerOn: s.rulerOn,
        autoScrollSpeed: s.autoScrollSpeed,
      }),
    },
  ),
)

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** Read the theme the no-flash inline script already applied to <html>. */
function initialTheme(): ThemeName {
  if (typeof document !== 'undefined') {
    const t = document.documentElement.getAttribute('data-theme')
    if (t && (THEMES as string[]).includes(t)) return t as ThemeName
  }
  return 'light'
}

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type {
  Annotation,
  Bookmark,
  DocMeta,
  HighlightColor,
  InkAnnotation,
  Lang,
  NormRect,
  Note,
  OutlineNode,
  SearchMatch,
  TextAnnotation,
  ThemeName,
  TtsState,
} from '../types'
import { THEMES } from '../types'
import { newId } from '../lib/highlights'
import type { PageIndex } from '../lib/pdf/search'
import { detectLang } from '../i18n'

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'local' | 'error'
export type PanelKind = 'outline' | 'search' | 'notes' | 'bookmarks' | 'translate' | null
/** Page layout: continuous vertical scroll, horizontal page-by-page swipe, or two-up book spread. */
export type PageLayout = 'vertical' | 'horizontal' | 'dual'

/** Active annotate tool: reading (none), freehand ink, text box, or eraser. */
export type Tool = 'none' | 'ink' | 'text' | 'eraser'

/** A saved reading position for the link jump-back stack. */
export interface NavPos {
  page: number
  /** Scroll offset within the page (px at capture time), for precise return. */
  y?: number
}

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

  // --- reference pane (peek at another page; transient, not saved) --------
  refOpen: boolean
  refPage: number
  toggleRef: () => void
  setRefPage: (p: number) => void
  closeRef: () => void

  // --- link navigation history (jump-back stack) --------------------------
  /** Positions to return to after following in-document links (LIFO). */
  navStack: NavPos[]
  pushNav: (pos: NavPos) => void
  /** Pop the most recent position (returns it; undefined if empty). */
  popNav: () => NavPos | undefined
  /** Discard the whole jump-back history. */
  clearNav: () => void

  // --- auto-scroll --------------------------------------------------------
  autoScroll: boolean
  autoScrollSpeed: number // pixels per second
  setAutoScroll: (v: boolean) => void
  toggleAutoScroll: () => void
  setAutoScrollSpeed: (s: number) => void

  // --- text-to-speech -----------------------------------------------------
  /** Current PDF proxy, exposed in the store so the (sibling) toolbar can drive
   *  read-aloud. Not persisted; reset on open/close. */
  pdfDoc: PDFDocumentProxy | null
  setPdfDoc: (p: PDFDocumentProxy | null) => void
  ttsState: TtsState
  ttsRate: number
  ttsVoiceURI: string | null
  setTtsState: (s: TtsState) => void
  setTtsRate: (r: number) => void
  setTtsVoiceURI: (uri: string | null) => void

  // --- annotations --------------------------------------------------------
  annotations: Annotation[]
  setAnnotations: (list: Annotation[]) => void
  addAnnotation: (a: Annotation) => void
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void
  removeAnnotation: (id: string) => void

  // --- annotate: ink + text (works on scanned pages) ----------------------
  tool: Tool
  penColor: string
  penWidth: number // fraction of page width
  textSize: number // fraction of page height
  setTool: (t: Tool) => void
  setPenColor: (c: string) => void
  setPenWidth: (w: number) => void
  setTextSize: (s: number) => void
  inks: InkAnnotation[]
  texts: TextAnnotation[]
  setInks: (list: InkAnnotation[]) => void
  addInk: (a: InkAnnotation) => void
  removeInk: (id: string) => void
  setTexts: (list: TextAnnotation[]) => void
  addText: (t: TextAnnotation) => void
  updateText: (id: string, patch: Partial<TextAnnotation>) => void
  removeText: (id: string) => void
  /** Undo the most recently created ink or text. */
  undoAnnot: () => void

  // --- standalone notes (vocabulary / free notes) -------------------------
  notes: Note[]
  setNotes: (list: Note[]) => void
  addNote: (n: Note) => void
  updateNote: (id: string, patch: Partial<Note>) => void
  removeNote: (id: string) => void

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

  // --- translate (dictionary on selection / typed word) -------------------
  translateInput: string
  translateTarget: Lang
  setTranslateInput: (s: string) => void
  setTranslateTarget: (l: Lang) => void
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
          inks: [],
          texts: [],
          notes: [],
          tool: 'none',
          outline: [],
          searchQuery: '',
          searchMatches: [],
          searchActiveIndex: -1,
          searchIndex: [],
          currentPage: meta.lastPage ?? 1,
          pendingScroll: meta.lastPage && meta.lastPage > 1 ? { page: meta.lastPage } : null,
          pdfDoc: null,
          ttsState: 'idle',
          navStack: [],
          refOpen: false,
          refPage: 1,
        }),
      closeDoc: () =>
        set({
          doc: null,
          pdfData: null,
          numPages: 0,
          annotations: [],
          bookmarks: [],
          inks: [],
          texts: [],
          notes: [],
          tool: 'none',
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
          pdfDoc: null,
          ttsState: 'idle',
          navStack: [],
          refOpen: false,
          refPage: 1,
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

      // reference pane (peek at another page)
      refOpen: false,
      refPage: 1,
      toggleRef: () =>
        set((s) => ({ refOpen: !s.refOpen, refPage: s.refOpen ? s.refPage : s.currentPage })),
      setRefPage: (refPage) => set({ refPage }),
      closeRef: () => set({ refOpen: false }),

      // link navigation history
      navStack: [],
      pushNav: (pos) => set({ navStack: [...get().navStack, pos] }),
      popNav: () => {
        const stack = get().navStack
        if (!stack.length) return undefined
        const pos = stack[stack.length - 1]
        set({ navStack: stack.slice(0, -1) })
        return pos
      },
      clearNav: () => set({ navStack: [] }),

      // auto-scroll
      autoScroll: false,
      autoScrollSpeed: 60,
      setAutoScroll: (autoScroll) => set({ autoScroll }),
      toggleAutoScroll: () => set({ autoScroll: !get().autoScroll }),
      setAutoScrollSpeed: (s) =>
        set({ autoScrollSpeed: clamp(s, MIN_AUTOSCROLL, MAX_AUTOSCROLL) }),

      // text-to-speech
      pdfDoc: null,
      setPdfDoc: (pdfDoc) => set({ pdfDoc }),
      ttsState: 'idle',
      ttsRate: 1,
      ttsVoiceURI: null,
      setTtsState: (ttsState) => set({ ttsState }),
      setTtsRate: (ttsRate) => set({ ttsRate: clamp(ttsRate, 0.5, 2) }),
      setTtsVoiceURI: (ttsVoiceURI) => set({ ttsVoiceURI }),

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

      // annotate (ink + text)
      tool: 'none',
      penColor: '#e5484d',
      penWidth: 0.0045,
      textSize: 0.024,
      setTool: (tool) => set({ tool }),
      setPenColor: (penColor) => set({ penColor }),
      setPenWidth: (penWidth) => set({ penWidth }),
      setTextSize: (textSize) => set({ textSize }),
      inks: [],
      texts: [],
      setInks: (inks) => set({ inks }),
      addInk: (a) => set({ inks: [...get().inks, a] }),
      removeInk: (id) => set({ inks: get().inks.filter((x) => x.id !== id) }),
      setTexts: (texts) => set({ texts }),
      addText: (t) => set({ texts: [...get().texts, t] }),
      updateText: (id, patch) =>
        set({
          texts: get().texts.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
          ),
        }),
      removeText: (id) => set({ texts: get().texts.filter((t) => t.id !== id) }),
      undoAnnot: () => {
        const { inks, texts } = get()
        const lastInk = inks[inks.length - 1]
        const lastText = texts[texts.length - 1]
        if (!lastInk && !lastText) return
        // Remove whichever was created most recently.
        if (lastText && (!lastInk || lastText.createdAt >= lastInk.createdAt)) {
          set({ texts: texts.slice(0, -1) })
        } else {
          set({ inks: inks.slice(0, -1) })
        }
      },

      // standalone notes
      notes: [],
      setNotes: (notes) => set({ notes }),
      addNote: (n) => set({ notes: [...get().notes, n] }),
      updateNote: (id, patch) =>
        set({
          notes: get().notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
          ),
        }),
      removeNote: (id) => set({ notes: get().notes.filter((n) => n.id !== id) }),

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

      // translate
      translateInput: '',
      translateTarget: detectLang(),
      setTranslateInput: (translateInput) => set({ translateInput }),
      setTranslateTarget: (translateTarget) => set({ translateTarget }),
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
        ttsRate: s.ttsRate,
        ttsVoiceURI: s.ttsVoiceURI,
        penColor: s.penColor,
        penWidth: s.penWidth,
        textSize: s.textSize,
        translateTarget: s.translateTarget,
        // Reuse the short-lived (~1h) Drive token across reloads so reopening a
        // book doesn't re-prompt. Scope is drive.file only; a stale/revoked one
        // self-heals via the 401 → interactive retry in authedFetch.
        accessToken: s.accessToken,
        tokenExpiresAt: s.tokenExpiresAt,
        userEmail: s.userEmail,
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

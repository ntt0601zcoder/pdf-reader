import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { useMessages } from '../hooks/useMessages'
import { signOut } from '../lib/google/auth'
import { flushNow } from '../lib/storage'
import type { ThemeName } from '../types'
import { SyncStatus } from './SyncStatus'
import {
  IconBookmark,
  IconBookmarkFilled,
  IconChevronLeft,
  IconChevronRight,
  IconFitWidth,
  IconGlobe,
  IconList,
  IconNote,
  IconPalette,
  IconSearch,
  IconZoomIn,
  IconZoomOut,
} from './icons'

export function Toolbar() {
  const m = useMessages()
  const doc = useStore((s) => s.doc)
  const numPages = useStore((s) => s.numPages)
  const currentPage = useStore((s) => s.currentPage)
  const scale = useStore((s) => s.scale)
  const theme = useStore((s) => s.theme)
  const lang = useStore((s) => s.lang)
  const panel = useStore((s) => s.panel)
  const userEmail = useStore((s) => s.userEmail)
  const isBookmarked = useStore((s) => s.bookmarks.some((b) => b.page === s.currentPage))
  const toggleBookmark = useStore((s) => s.toggleBookmark)

  const setScale = useStore((s) => s.setScale)
  const zoomIn = useStore((s) => s.zoomIn)
  const zoomOut = useStore((s) => s.zoomOut)
  const setCurrentPage = useStore((s) => s.setCurrentPage)
  const requestScroll = useStore((s) => s.requestScroll)
  const setTheme = useStore((s) => s.setTheme)
  const toggleLang = useStore((s) => s.toggleLang)
  const togglePanel = useStore((s) => s.togglePanel)
  const closeDoc = useStore((s) => s.closeDoc)

  const [themeOpen, setThemeOpen] = useState(false)
  const [pageDraft, setPageDraft] = useState(String(currentPage))

  // Resync the input text when the page changes from outside (buttons, outline,
  // search jumps, scroll-driven observer).
  useEffect(() => {
    setPageDraft(String(currentPage))
  }, [currentPage])

  function goToPage(n: number) {
    const page = Math.min(Math.max(1, n), numPages || 1)
    setCurrentPage(page)
    requestScroll(page)
  }

  function commitPage() {
    const n = parseInt(pageDraft, 10)
    if (!Number.isNaN(n)) goToPage(n)
    else setPageDraft(String(currentPage))
  }

  function fitWidth() {
    const viewer = document.querySelector<HTMLElement>('.viewer')
    const page = document.querySelector<HTMLElement>('.pdf-page')
    if (!viewer || !page) return
    const natural = page.clientWidth / scale
    if (natural > 0) setScale((viewer.clientWidth - 48) / natural)
  }

  const themes: { key: ThemeName; label: string }[] = [
    { key: 'light', label: m.themeLight },
    { key: 'sepia', label: m.themeSepia },
    { key: 'dark', label: m.themeDark },
  ]

  return (
    <header className="toolbar">
      <div className="toolbar__group">
        <button
          className="icon-btn"
          title={m.openAnother}
          onClick={() => {
            void flushNow()
            closeDoc()
          }}
        >
          <IconChevronLeft />
        </button>
        <span className="toolbar__title">{doc?.name ?? m.appName}</span>
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        <button
          className="icon-btn"
          title={m.prevPage}
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
        >
          <IconChevronLeft />
        </button>
        <input
          className="page-input"
          value={pageDraft}
          onChange={(e) => setPageDraft(e.target.value)}
          onBlur={commitPage}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitPage()
              e.currentTarget.blur()
            }
          }}
          aria-label={m.page}
        />
        <span className="page-total">/ {numPages || '—'}</span>
        <button
          className="icon-btn"
          title={m.nextPage}
          disabled={currentPage >= numPages}
          onClick={() => goToPage(currentPage + 1)}
        >
          <IconChevronRight />
        </button>
        <button
          className={`icon-btn${isBookmarked ? ' is-active' : ''}`}
          title={m.bookmarkThisPage}
          aria-pressed={isBookmarked}
          onClick={() => toggleBookmark(currentPage)}
        >
          {isBookmarked ? <IconBookmarkFilled /> : <IconBookmark />}
        </button>
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        <button className="icon-btn" title={m.zoomOut} onClick={zoomOut}>
          <IconZoomOut />
        </button>
        <span className="zoom-level">{Math.round(scale * 100)}%</span>
        <button className="icon-btn" title={m.zoomIn} onClick={zoomIn}>
          <IconZoomIn />
        </button>
        <button className="icon-btn" title={m.fitWidth} onClick={fitWidth}>
          <IconFitWidth />
        </button>
      </div>

      <div className="toolbar__spacer" />

      <SyncStatus />

      <div className="toolbar__group">
        <button
          className={`icon-btn${panel === 'outline' ? ' is-active' : ''}`}
          title={m.toggleOutline}
          onClick={() => togglePanel('outline')}
        >
          <IconList />
        </button>
        <button
          className={`icon-btn${panel === 'search' ? ' is-active' : ''}`}
          title={m.toggleSearch}
          onClick={() => togglePanel('search')}
        >
          <IconSearch />
        </button>
        <button
          className={`icon-btn${panel === 'bookmarks' ? ' is-active' : ''}`}
          title={m.toggleBookmarks}
          onClick={() => togglePanel('bookmarks')}
        >
          <IconBookmark />
        </button>
        <button
          className={`icon-btn${panel === 'notes' ? ' is-active' : ''}`}
          title={m.toggleNotes}
          onClick={() => togglePanel('notes')}
        >
          <IconNote />
        </button>
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        <div className="menu">
          <button
            className="icon-btn"
            title={m.theme}
            onClick={() => setThemeOpen((v) => !v)}
          >
            <IconPalette />
          </button>
          {themeOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                onClick={() => setThemeOpen(false)}
              />
              <div className="menu__panel">
                {themes.map((t) => (
                  <button
                    key={t.key}
                    className={`menu__item${theme === t.key ? ' is-active' : ''}`}
                    onClick={() => {
                      setTheme(t.key)
                      setThemeOpen(false)
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          className="icon-btn icon-btn--labeled"
          title={m.language}
          onClick={toggleLang}
        >
          <IconGlobe />
          {lang === 'vi' ? 'VI' : 'EN'}
        </button>
      </div>

      {userEmail && (
        <>
          <div className="toolbar__divider" />
          <div className="toolbar__group">
            <span className="user-chip" title={userEmail}>
              {userEmail}
            </span>
            <button className="icon-btn" title={m.signOut} onClick={() => signOut()}>
              {m.signOut}
            </button>
          </div>
        </>
      )}
    </header>
  )
}

import { useEffect, useState } from 'react'
import { useStore, AUTOSCROLL_STEP } from '../store/useStore'
import { useMessages } from '../hooks/useMessages'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { TtsApi } from '../hooks/useTextToSpeech'
import { AnnotateMenu } from './AnnotateMenu'
import { signOut } from '../lib/google/auth'
import { flushNow } from '../lib/storage'
import type { ThemeName } from '../types'
import { SyncStatus } from './SyncStatus'
import {
  IconBookmark,
  IconBookmarkFilled,
  IconBrightness,
  IconChevronLeft,
  IconChevronRight,
  IconFitWidth,
  IconGlobe,
  IconLayoutDual,
  IconLayoutHorizontal,
  IconLayoutVertical,
  IconList,
  IconMore,
  IconNote,
  IconPalette,
  IconPause,
  IconPlay,
  IconRuler,
  IconSearch,
  IconSpeaker,
  IconStop,
  IconZoomIn,
  IconZoomOut,
} from './icons'

export function Toolbar({ tts }: { tts: TtsApi }) {
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
  const pageLayout = useStore((s) => s.layout)
  const setLayout = useStore((s) => s.setLayout)
  const dimLevel = useStore((s) => s.dimLevel)
  const setDimLevel = useStore((s) => s.setDimLevel)
  const rulerOn = useStore((s) => s.rulerOn)
  const toggleRuler = useStore((s) => s.toggleRuler)
  const autoScroll = useStore((s) => s.autoScroll)
  const autoScrollSpeed = useStore((s) => s.autoScrollSpeed)
  const toggleAutoScroll = useStore((s) => s.toggleAutoScroll)
  const setAutoScrollSpeed = useStore((s) => s.setAutoScrollSpeed)

  const setScale = useStore((s) => s.setScale)
  const zoomIn = useStore((s) => s.zoomIn)
  const zoomOut = useStore((s) => s.zoomOut)
  const setCurrentPage = useStore((s) => s.setCurrentPage)
  const requestScroll = useStore((s) => s.requestScroll)
  const setTheme = useStore((s) => s.setTheme)
  const toggleLang = useStore((s) => s.toggleLang)
  const togglePanel = useStore((s) => s.togglePanel)
  const closeDoc = useStore((s) => s.closeDoc)

  const narrow = useMediaQuery('(max-width: 760px)')
  const [themeOpen, setThemeOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [pageDraft, setPageDraft] = useState(String(currentPage))

  useEffect(() => setPageDraft(String(currentPage)), [currentPage])
  useEffect(() => {
    if (!narrow) setMoreOpen(false)
  }, [narrow])

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
    if (natural <= 0) return
    if (pageLayout === 'dual') {
      // Fit a SPREAD (two pages + the 24px column gap), mirroring the
      // entering-dual fit in PdfViewer so the two-up layout stays intact.
      setScale((viewer.clientWidth - 48 - 24) / 2 / natural)
    } else {
      setScale((viewer.clientWidth - (narrow ? 16 : 48)) / natural)
    }
  }

  const themeGroups: {
    label: string
    items: { key: ThemeName; label: string; swatch: string }[]
  }[] = [
    {
      label: m.themeGroupLight,
      items: [
        { key: 'light', label: m.themeLight, swatch: '#ffffff' },
        { key: 'gray', label: m.themeGray, swatch: '#d3d8dd' },
        { key: 'sepia', label: m.themeSepia, swatch: '#f4ecd8' },
        { key: 'solarized-light', label: m.themeSolarizedLight, swatch: '#fdf6e3' },
      ],
    },
    {
      label: m.themeGroupDark,
      items: [
        { key: 'dark', label: m.themeDark, swatch: '#1e2227' },
        { key: 'dim', label: m.themeDim, swatch: '#2a2f33' },
        { key: 'night', label: m.themeNight, swatch: '#2a2114' },
        { key: 'black', label: m.themeBlack, swatch: '#000000' },
        { key: 'contrast', label: m.themeContrast, swatch: '#000000' },
        { key: 'one-dark', label: m.themeOneDark, swatch: '#282c34' },
        { key: 'dracula', label: m.themeDracula, swatch: '#282a36' },
        { key: 'nord', label: m.themeNord, swatch: '#2e3440' },
        { key: 'gruvbox', label: m.themeGruvbox, swatch: '#282828' },
        { key: 'monokai', label: m.themeMonokai, swatch: '#272822' },
        { key: 'solarized-dark', label: m.themeSolarizedDark, swatch: '#002b36' },
      ],
    },
  ]

  const themeList = (close: () => void) =>
    themeGroups.map((g) => (
      <div key={g.label}>
        <div className="menu__group-label">{g.label}</div>
        {g.items.map((t) => (
          <button
            key={t.key}
            className={`menu__item${theme === t.key ? ' is-active' : ''}`}
            onClick={() => {
              setTheme(t.key)
              close()
            }}
          >
            <span className="menu__swatch" style={{ background: t.swatch }} />
            {t.label}
          </button>
        ))}
      </div>
    ))

  // Night-reading brightness slider, reused in the desktop theme popover and
  // the mobile more-menu. 0 dim = 100% brightness, 0.7 dim = 0%.
  const brightnessControl = (
    <>
      <div className="menu__group-label">{m.brightness}</div>
      <div className="menu__slider" onClick={(e) => e.stopPropagation()}>
        <IconBrightness width={15} height={15} />
        <input
          type="range"
          min={0}
          max={0.7}
          step={0.05}
          value={dimLevel}
          onChange={(e) => setDimLevel(Number(e.target.value))}
          aria-label={m.brightness}
        />
        <span className="menu__slider-val">{Math.round((1 - dimLevel / 0.7) * 100)}%</span>
      </div>
    </>
  )

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
        <AnnotateMenu />
      </div>

      {/* ---------- Wide layout: everything inline ---------- */}
      {!narrow && (
        <>
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
            <div className="toolbar__seg" role="group" aria-label={m.layout}>
              <button
                className={`icon-btn${pageLayout === 'vertical' ? ' is-active' : ''}`}
                title={`${m.layout}: ${m.layoutVertical}`}
                aria-pressed={pageLayout === 'vertical'}
                onClick={() => setLayout('vertical')}
              >
                <IconLayoutVertical />
              </button>
              <button
                className={`icon-btn${pageLayout === 'horizontal' ? ' is-active' : ''}`}
                title={`${m.layout}: ${m.layoutHorizontal}`}
                aria-pressed={pageLayout === 'horizontal'}
                onClick={() => setLayout('horizontal')}
              >
                <IconLayoutHorizontal />
              </button>
              <button
                className={`icon-btn${pageLayout === 'dual' ? ' is-active' : ''}`}
                title={`${m.layout}: ${m.layoutDual}`}
                aria-pressed={pageLayout === 'dual'}
                onClick={() => setLayout('dual')}
              >
                <IconLayoutDual />
              </button>
            </div>
            <button
              className={`icon-btn${rulerOn ? ' is-active' : ''}`}
              title={m.readingRuler}
              aria-pressed={rulerOn}
              onClick={toggleRuler}
            >
              <IconRuler />
            </button>
            {pageLayout !== 'horizontal' && (
              <>
                <button
                  className={`icon-btn${autoScroll ? ' is-active' : ''}`}
                  title={autoScroll ? m.autoScrollPause : m.autoScrollPlay}
                  aria-pressed={autoScroll}
                  onClick={toggleAutoScroll}
                >
                  {autoScroll ? <IconPause /> : <IconPlay />}
                </button>
                {autoScroll && (
                  <span className="toolbar__seg" aria-label={m.autoScrollSpeed}>
                    <button
                      className="icon-btn"
                      title={m.autoScrollSlower}
                      onClick={() => setAutoScrollSpeed(autoScrollSpeed - AUTOSCROLL_STEP)}
                    >
                      −
                    </button>
                    <span className="zoom-level">{autoScrollSpeed}</span>
                    <button
                      className="icon-btn"
                      title={m.autoScrollFaster}
                      onClick={() => setAutoScrollSpeed(autoScrollSpeed + AUTOSCROLL_STEP)}
                    >
                      +
                    </button>
                  </span>
                )}
              </>
            )}
          </div>

          <div className="toolbar__group">
            <button
              className={`icon-btn${tts.state !== 'idle' ? ' is-active' : ''}`}
              title={
                tts.state === 'playing'
                  ? m.ttsPause
                  : tts.state === 'paused'
                    ? m.ttsResume
                    : tts.supported
                      ? m.readAloud
                      : m.ttsNotSupported
              }
              disabled={!tts.supported || numPages === 0}
              onClick={tts.toggle}
            >
              {tts.state === 'playing' ? (
                <IconPause />
              ) : tts.state === 'paused' ? (
                <IconPlay />
              ) : (
                <IconSpeaker />
              )}
            </button>
            {tts.state !== 'idle' && (
              <button className="icon-btn" title={m.stopReading} onClick={tts.stop}>
                <IconStop />
              </button>
            )}
            {tts.state !== 'idle' && tts.supported && (
              <>
                <select
                  className="tts-select"
                  aria-label={m.ttsRate}
                  title={m.ttsRate}
                  value={tts.rate}
                  onChange={(e) => tts.setRate(Number(e.target.value))}
                >
                  {[0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
                    <option key={r} value={r}>
                      {r}x
                    </option>
                  ))}
                </select>
                {tts.voices.length > 0 && (
                  <select
                    className="tts-select"
                    aria-label={m.ttsVoice}
                    title={m.ttsVoice}
                    value={tts.voiceURI ?? ''}
                    onChange={(e) => tts.setVoiceURI(e.target.value || null)}
                  >
                    <option value="">{m.ttsVoiceDefault}</option>
                    {tts.voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
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
              <button className="icon-btn" title={m.theme} onClick={() => setThemeOpen((v) => !v)}>
                <IconPalette />
              </button>
              {themeOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                    onClick={() => setThemeOpen(false)}
                  />
                  <div className="menu__panel">
                    {brightnessControl}
                    <div className="menu__sep" />
                    {themeList(() => setThemeOpen(false))}
                  </div>
                </>
              )}
            </div>
            <button className="icon-btn icon-btn--labeled" title={m.language} onClick={toggleLang}>
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
        </>
      )}

      {/* ---------- Narrow layout: a single "more" menu ---------- */}
      {narrow && (
        <>
          <div className="toolbar__spacer" />
          {tts.state !== 'idle' && (
            <>
              <button
                className="icon-btn"
                title={tts.state === 'playing' ? m.ttsPause : m.ttsResume}
                onClick={tts.toggle}
              >
                {tts.state === 'playing' ? <IconPause /> : <IconPlay />}
              </button>
              <button className="icon-btn" title={m.stopReading} onClick={tts.stop}>
                <IconStop />
              </button>
            </>
          )}
          <SyncStatus />
          <div className="menu">
            <button
              className={`icon-btn${moreOpen ? ' is-active' : ''}`}
              title={m.theme}
              aria-label="menu"
              onClick={() => setMoreOpen((v) => !v)}
            >
              <IconMore />
            </button>
            {moreOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                  onClick={() => setMoreOpen(false)}
                />
                <div className="menu__panel menu__panel--wide">
                  <div className="menu__row">
                    <button className="icon-btn" title={m.zoomOut} onClick={zoomOut}>
                      <IconZoomOut />
                    </button>
                    <span className="zoom-level">{Math.round(scale * 100)}%</span>
                    <button className="icon-btn" title={m.zoomIn} onClick={zoomIn}>
                      <IconZoomIn />
                    </button>
                    <button
                      className="icon-btn icon-btn--labeled"
                      onClick={() => {
                        fitWidth()
                        setMoreOpen(false)
                      }}
                    >
                      <IconFitWidth />
                      {m.fitWidth}
                    </button>
                  </div>

                  <button
                    className="menu__item"
                    onClick={() => {
                      setLayout('vertical')
                      setMoreOpen(false)
                    }}
                  >
                    <IconLayoutVertical width={16} height={16} />
                    {m.layout}: {m.layoutVertical}
                    {pageLayout === 'vertical' ? ' ✓' : ''}
                  </button>
                  <button
                    className="menu__item"
                    onClick={() => {
                      setLayout('horizontal')
                      setMoreOpen(false)
                    }}
                  >
                    <IconLayoutHorizontal width={16} height={16} />
                    {m.layout}: {m.layoutHorizontal}
                    {pageLayout === 'horizontal' ? ' ✓' : ''}
                  </button>
                  <button
                    className={`menu__item${rulerOn ? ' is-active' : ''}`}
                    onClick={() => {
                      toggleRuler()
                      setMoreOpen(false)
                    }}
                  >
                    <IconRuler width={16} height={16} />
                    {m.readingRuler}
                    {rulerOn ? ' ✓' : ''}
                  </button>
                  {pageLayout !== 'horizontal' && (
                    <>
                      <button
                        className={`menu__item${autoScroll ? ' is-active' : ''}`}
                        onClick={toggleAutoScroll}
                      >
                        {autoScroll ? (
                          <IconPause width={16} height={16} />
                        ) : (
                          <IconPlay width={16} height={16} />
                        )}
                        {autoScroll ? m.autoScrollPause : m.autoScrollPlay}
                      </button>
                      <div className="menu__row">
                        <button
                          className="icon-btn"
                          title={m.autoScrollSlower}
                          onClick={() => setAutoScrollSpeed(autoScrollSpeed - AUTOSCROLL_STEP)}
                        >
                          −
                        </button>
                        <span className="zoom-level">{autoScrollSpeed}</span>
                        <button
                          className="icon-btn"
                          title={m.autoScrollFaster}
                          onClick={() => setAutoScrollSpeed(autoScrollSpeed + AUTOSCROLL_STEP)}
                        >
                          +
                        </button>
                      </div>
                    </>
                  )}

                  <button
                    className={`menu__item${tts.state !== 'idle' ? ' is-active' : ''}`}
                    disabled={!tts.supported || numPages === 0}
                    onClick={tts.toggle}
                  >
                    {tts.state === 'playing' ? (
                      <IconPause width={16} height={16} />
                    ) : tts.state === 'paused' ? (
                      <IconPlay width={16} height={16} />
                    ) : (
                      <IconSpeaker width={16} height={16} />
                    )}
                    {tts.state === 'playing'
                      ? m.ttsPause
                      : tts.state === 'paused'
                        ? m.ttsResume
                        : m.readAloud}
                  </button>
                  {tts.state !== 'idle' && (
                    <button
                      className="menu__item"
                      onClick={() => {
                        tts.stop()
                        setMoreOpen(false)
                      }}
                    >
                      <IconStop width={16} height={16} />
                      {m.stopReading}
                    </button>
                  )}
                  {tts.supported && (
                    <div className="menu__row">
                      <span className="menu__group-label">{m.ttsRate}</span>
                      <select
                        value={tts.rate}
                        onChange={(e) => tts.setRate(Number(e.target.value))}
                      >
                        {[0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
                          <option key={r} value={r}>
                            {r}x
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {tts.supported && tts.voices.length > 0 && (
                    <div className="menu__row">
                      <span className="menu__group-label">{m.ttsVoice}</span>
                      <select
                        value={tts.voiceURI ?? ''}
                        onChange={(e) => tts.setVoiceURI(e.target.value || null)}
                      >
                        <option value="">{m.ttsVoiceDefault}</option>
                        {tts.voices.map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="menu__sep" />

                  <button
                    className="menu__item"
                    onClick={() => {
                      togglePanel('outline')
                      setMoreOpen(false)
                    }}
                  >
                    <IconList width={16} height={16} />
                    {m.toggleOutline}
                  </button>
                  <button
                    className="menu__item"
                    onClick={() => {
                      togglePanel('search')
                      setMoreOpen(false)
                    }}
                  >
                    <IconSearch width={16} height={16} />
                    {m.toggleSearch}
                  </button>
                  <button
                    className="menu__item"
                    onClick={() => {
                      togglePanel('bookmarks')
                      setMoreOpen(false)
                    }}
                  >
                    <IconBookmark width={16} height={16} />
                    {m.toggleBookmarks}
                  </button>
                  <button
                    className="menu__item"
                    onClick={() => {
                      togglePanel('notes')
                      setMoreOpen(false)
                    }}
                  >
                    <IconNote width={16} height={16} />
                    {m.toggleNotes}
                  </button>

                  <div className="menu__sep" />

                  <button className="menu__item" onClick={toggleLang}>
                    <IconGlobe width={16} height={16} />
                    {m.language}: {lang === 'vi' ? 'VI' : 'EN'}
                  </button>

                  <div className="menu__sep" />
                  {brightnessControl}

                  <div className="menu__sep" />
                  <div className="menu__group-label">{m.theme}</div>
                  {themeList(() => setMoreOpen(false))}

                  {userEmail && (
                    <>
                      <div className="menu__sep" />
                      <button className="menu__item" onClick={() => signOut()}>
                        {m.signOut} — {userEmail}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </header>
  )
}

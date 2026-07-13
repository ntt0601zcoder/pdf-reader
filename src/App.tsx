import { useEffect } from 'react'
import { useTheme } from './hooks/useTheme'
import { useMessages } from './hooks/useMessages'
import { useTextToSpeech } from './hooks/useTextToSpeech'
import { useStore } from './store/useStore'
import { Toolbar } from './components/Toolbar'
import { Welcome } from './components/Welcome'
import { Sidebar } from './components/Sidebar/Sidebar'
import { PdfViewer } from './components/Viewer/PdfViewer'
import { ReferencePane } from './components/ReferencePane'
import { AnnotateHint } from './components/AnnotateMenu'
import { BackNavButton } from './components/BackNavButton'
import { IconClose } from './components/icons'

export default function App() {
  useTheme()
  const m = useMessages()
  const doc = useStore((s) => s.doc)
  const docLoading = useStore((s) => s.docLoading)
  const docError = useStore((s) => s.docError)
  const setDocError = useStore((s) => s.setDocError)
  // Read-aloud engine lives here so the (sibling) toolbar can drive it.
  const tts = useTextToSpeech()

  // Cmd/Ctrl+X jumps straight to search. Skipped in editable fields so Cut still
  // works there (and it's a no-op over the readonly document anyway).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.code !== 'KeyX') return
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
      if (!useStore.getState().doc) return
      e.preventDefault()
      useStore.getState().setPanel('search')
      setTimeout(() => document.querySelector<HTMLInputElement>('.search-box input')?.focus(), 60)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      {doc ? (
        <>
          <Toolbar tts={tts} />
          <div className="app__body">
            <PdfViewer />
            <ReferencePane />
            <Sidebar />
          </div>
          <AnnotateHint />
          <BackNavButton />
          <DimOverlay />
        </>
      ) : docLoading ? (
        <div className="center-state">
          <div className="spinner" />
          <span>{m.loadingDrive}</span>
        </div>
      ) : (
        <>
          {docError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border)',
                color: '#e5484d',
              }}
            >
              <span style={{ flex: 1 }}>
                {m.errDrive} <span style={{ opacity: 0.7 }}>({docError})</span>
              </span>
              <button
                className="icon-btn"
                onClick={() => setDocError(null)}
                aria-label="dismiss"
              >
                <IconClose width={15} height={15} />
              </button>
            </div>
          )}
          <Welcome />
        </>
      )}
    </div>
  )
}

/**
 * Night-reading dim: an app-level, pointer-events:none black layer over the
 * reading area. It sits below the toolbar/sidebar (see .dim-overlay z-index) so
 * controls stay bright and clickable, and never touches the page canvas filter
 * or text selection.
 */
function DimOverlay() {
  const dim = useStore((s) => s.dimLevel)
  if (dim <= 0) return null
  return <div className="dim-overlay" aria-hidden style={{ ['--dim' as never]: dim }} />
}

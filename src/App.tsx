import { useTheme } from './hooks/useTheme'
import { useMessages } from './hooks/useMessages'
import { useTextToSpeech } from './hooks/useTextToSpeech'
import { useStore } from './store/useStore'
import { Toolbar } from './components/Toolbar'
import { Welcome } from './components/Welcome'
import { Sidebar } from './components/Sidebar/Sidebar'
import { PdfViewer } from './components/Viewer/PdfViewer'
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

  return (
    <div className="app">
      {doc ? (
        <>
          <Toolbar tts={tts} />
          <div className="app__body">
            <PdfViewer />
            <Sidebar />
          </div>
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

import { useTheme } from './hooks/useTheme'
import { useMessages } from './hooks/useMessages'
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

  return (
    <div className="app">
      {doc ? (
        <>
          <Toolbar />
          <div className="app__body">
            <PdfViewer />
            <Sidebar />
          </div>
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

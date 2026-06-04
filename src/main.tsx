import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/theme.css'
import './styles/app.css'
import { initAutosave } from './lib/storage'
import { initGoogleAuth } from './lib/google/auth'
import { isGoogleConfigured } from './lib/google/config'

// Wire annotation autosave (store subscription) once at startup.
initAutosave()

// Warm up the GIS token client if Drive is configured (non-blocking).
if (isGoogleConfigured()) {
  initGoogleAuth().catch(() => {})
}

// NOTE: intentionally no React.StrictMode — its dev double-mount makes react-pdf
// attempt to re-read the (already transferred) PDF ArrayBuffer and error out.
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Google Identity Services + Picker use popups/postMessage. Keep COOP relaxed
    // so the OAuth popup can communicate back to the opener window.
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  optimizeDeps: {
    // pdfjs ships an ESM worker; let Vite handle it rather than pre-bundling.
    exclude: ['pdfjs-dist'],
  },
})

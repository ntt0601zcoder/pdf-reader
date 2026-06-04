import { pdfjs } from 'react-pdf'

// react-pdf v10 CSS (no "esm" segment in the path). Without these the text
// layer spans are mis-scaled and selection/highlight rects won't line up.
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

// Vite-friendly worker resolution. The worker is a native ESM .mjs in pdf.js
// v5; `new URL(..., import.meta.url)` lets Vite emit it as a hashed asset.
// Must run in the same module graph that renders <Document>.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export { pdfjs }

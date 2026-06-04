import type { Annotation } from '../../types'
import { colorVar } from '../../lib/highlights'

interface Props {
  annotations: Annotation[]
  pageWidth: number
  pageHeight: number
}

/**
 * Renders colored overlay rects for every highlight on a page. Purely visual:
 * pointer-events are disabled (see app.css) so the text layer below stays
 * selectable; opening a note is handled by a hit-test in PdfPage's mouseup.
 */
export function HighlightLayer({ annotations, pageWidth, pageHeight }: Props) {
  return (
    <div className="overlay-layer">
      {annotations.flatMap((a) =>
        a.rects.map((r, i) => (
          <div
            key={`${a.id}_${i}`}
            className="hl-rect"
            data-highlight-id={a.id}
            data-has-note={a.note ? 'true' : 'false'}
            style={{
              left: r.x * pageWidth,
              top: r.y * pageHeight,
              width: r.width * pageWidth,
              height: r.height * pageHeight,
              backgroundColor: colorVar(a.color),
            }}
          />
        )),
      )}
    </div>
  )
}

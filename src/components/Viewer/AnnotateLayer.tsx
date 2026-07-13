import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useStore } from '../../store/useStore'
import { newId } from '../../lib/highlights'
import type { InkAnnotation, NormPoint, TextAnnotation } from '../../types'

interface Props {
  page: number
  width: number
  height: number
  inks: InkAnnotation[]
  texts: TextAnnotation[]
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/**
 * Freehand ink + text-box overlay for a page. Geometry is stored as 0..1
 * fractions of the page box so drawings survive zoom. It sits above the page and
 * only captures pointer events when a tool is active (reading mode passes clicks
 * through), so text selection / links keep working when not annotating.
 */
export function AnnotateLayer({ page, width, height, inks, texts }: Props) {
  const tool = useStore((s) => s.tool)
  const penColor = useStore((s) => s.penColor)
  const penWidth = useStore((s) => s.penWidth)
  const textSize = useStore((s) => s.textSize)
  const addInk = useStore((s) => s.addInk)
  const removeInk = useStore((s) => s.removeInk)
  const addText = useStore((s) => s.addText)
  const updateText = useStore((s) => s.updateText)
  const removeText = useStore((s) => s.removeText)

  const ref = useRef<HTMLDivElement>(null)
  const [drawing, setDrawing] = useState<NormPoint[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const erasing = useRef(false)

  const norm = (e: ReactPointerEvent): NormPoint => {
    const r = ref.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }

  // Delete any stroke whose path passes near the point.
  const eraseAt = (p: NormPoint) => {
    for (const ink of inks) {
      if (ink.points.some((pt) => Math.hypot(pt.x - p.x, pt.y - p.y) < 0.02)) {
        removeInk(ink.id)
      }
    }
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (tool === 'ink') {
      setDrawing([norm(e)])
      e.currentTarget.setPointerCapture(e.pointerId)
      e.preventDefault()
    } else if (tool === 'text') {
      // Clicking an existing box edits it (handled there); anywhere else adds one.
      if ((e.target as HTMLElement).closest('.annotate-text')) return
      const p = norm(e)
      const id = newId()
      const now = Date.now()
      addText({ id, page, x: clamp01(p.x), y: clamp01(p.y), text: '', color: penColor, size: textSize, createdAt: now, updatedAt: now })
      setEditingId(id)
    } else if (tool === 'eraser') {
      erasing.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      eraseAt(norm(e))
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (tool === 'ink' && drawing) {
      const p = norm(e)
      const last = drawing[drawing.length - 1]
      if (Math.hypot(p.x - last.x, p.y - last.y) > 0.003) {
        setDrawing([...drawing, p])
      }
      e.preventDefault()
    } else if (tool === 'eraser' && erasing.current) {
      eraseAt(norm(e))
    }
  }

  const onPointerUp = () => {
    if (tool === 'ink' && drawing) {
      if (drawing.length >= 2) {
        addInk({ id: newId(), page, color: penColor, width: penWidth, points: drawing, createdAt: Date.now() })
      }
      setDrawing(null)
    }
    erasing.current = false
  }

  const toSvg = (pts: NormPoint[]) => pts.map((p) => `${p.x * width},${p.y * height}`).join(' ')

  return (
    <div
      ref={ref}
      className="annotate-layer"
      data-tool={tool}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg className="annotate-ink" width={width} height={height}>
        {inks.map((ink) => (
          <polyline
            key={ink.id}
            points={toSvg(ink.points)}
            fill="none"
            stroke={ink.color}
            strokeWidth={ink.width * width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {drawing && drawing.length > 1 && (
          <polyline
            points={toSvg(drawing)}
            fill="none"
            stroke={penColor}
            strokeWidth={penWidth * width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {texts.map((t) => (
        <TextBox
          key={t.id}
          t={t}
          width={width}
          height={height}
          tool={tool}
          editing={editingId === t.id}
          onEdit={() => setEditingId(t.id)}
          onMove={(x, y) => updateText(t.id, { x, y })}
          onRemove={() => {
            removeText(t.id)
            if (editingId === t.id) setEditingId(null)
          }}
          onCommit={(text) => {
            if (!text.trim()) removeText(t.id)
            else updateText(t.id, { text })
            setEditingId(null)
          }}
        />
      ))}
    </div>
  )
}

function TextBox({
  t,
  width,
  height,
  tool,
  editing,
  onEdit,
  onMove,
  onRemove,
  onCommit,
}: {
  t: TextAnnotation
  width: number
  height: number
  tool: string
  editing: boolean
  onEdit: () => void
  onMove: (x: number, y: number) => void
  onRemove: () => void
  onCommit: (text: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null)

  // Fill + focus the box when it enters edit mode (uncontrolled while editing so
  // the caret doesn't jump). Layout effect so focus lands before paint.
  useLayoutEffect(() => {
    if (!editing || !ref.current) return
    ref.current.textContent = t.text
    ref.current.focus()
    const range = document.createRange()
    range.selectNodeContents(ref.current)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  return (
    <div
      ref={ref}
      className={`annotate-text${editing ? ' is-editing' : ''}`}
      style={{
        left: t.x * width,
        top: t.y * height,
        fontSize: t.size * height,
        color: t.color,
      }}
      contentEditable={editing}
      suppressContentEditableWarning
      onPointerDown={(e) => {
        if (tool === 'eraser') {
          e.stopPropagation()
          onRemove()
          return
        }
        if (tool !== 'text' || editing) return
        e.stopPropagation() // don't let the layer create a new box
        drag.current = { sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y, moved: false }
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        if (Math.abs(e.clientX - d.sx) > 3 || Math.abs(e.clientY - d.sy) > 3) d.moved = true
        if (d.moved) {
          onMove(
            clamp01(d.ox + (e.clientX - d.sx) / width),
            clamp01(d.oy + (e.clientY - d.sy) / height),
          )
        }
      }}
      onPointerUp={() => {
        const d = drag.current
        drag.current = null
        if (d && !d.moved) onEdit() // tap (no drag) → edit
      }}
      onBlur={() => {
        if (editing) onCommit(ref.current?.textContent ?? '')
      }}
    >
      {editing ? null : t.text}
    </div>
  )
}

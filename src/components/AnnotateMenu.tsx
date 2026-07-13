import { useState, type ReactNode } from 'react'
import { useStore } from '../store/useStore'
import { useMessages } from '../hooks/useMessages'
import { INK_COLORS, INK_WIDTHS, TEXT_SIZES } from '../types'
import type { Tool } from '../store/useStore'
import { IconPen, IconTextBox, IconEraser, IconUndo } from './icons'

/**
 * Pencil button + popover for the annotate tools (freehand ink, text box,
 * eraser) plus color / size and undo. Works over any page, including scanned
 * PDFs, since the drawing overlay doesn't rely on a text layer.
 */
export function AnnotateMenu() {
  const m = useMessages()
  const tool = useStore((s) => s.tool)
  const setTool = useStore((s) => s.setTool)
  const penColor = useStore((s) => s.penColor)
  const setPenColor = useStore((s) => s.setPenColor)
  const penWidth = useStore((s) => s.penWidth)
  const setPenWidth = useStore((s) => s.setPenWidth)
  const textSize = useStore((s) => s.textSize)
  const setTextSize = useStore((s) => s.setTextSize)
  const undoAnnot = useStore((s) => s.undoAnnot)
  const [open, setOpen] = useState(false)

  const toolBtn = (t: Tool, icon: ReactNode, label: string) => (
    <button
      className={`icon-btn${tool === t ? ' is-active' : ''}`}
      title={label}
      aria-pressed={tool === t}
      onClick={() => setTool(tool === t ? 'none' : t)}
    >
      {icon}
    </button>
  )

  return (
    <div className="menu">
      <button
        className={`icon-btn${tool !== 'none' ? ' is-active' : ''}`}
        title={m.annotate}
        aria-pressed={tool !== 'none'}
        onClick={() => setOpen((v) => !v)}
      >
        <IconPen />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div className="menu__panel menu__panel--wide">
            <div className="menu__row">
              {toolBtn('ink', <IconPen />, m.penTool)}
              {toolBtn('text', <IconTextBox />, m.textTool)}
              {toolBtn('eraser', <IconEraser />, m.eraserTool)}
              <button className="icon-btn" title={m.undo} onClick={() => undoAnnot()}>
                <IconUndo />
              </button>
            </div>

            <div className="menu__sep" />
            <div className="menu__group-label">{m.annotColor}</div>
            <div className="annotate-swatches">
              {INK_COLORS.map((c) => (
                <button
                  key={c}
                  className={`annotate-swatch${penColor === c ? ' is-active' : ''}`}
                  style={{ background: c }}
                  aria-label={c}
                  onClick={() => setPenColor(c)}
                />
              ))}
            </div>

            <div className="menu__sep" />
            <div className="menu__group-label">
              {tool === 'text' ? m.textSizeLabel : m.penWidthLabel}
            </div>
            <div className="menu__row">
              {tool === 'text'
                ? TEXT_SIZES.map((s, i) => (
                    <button
                      key={s}
                      className={`icon-btn${textSize === s ? ' is-active' : ''}`}
                      onClick={() => setTextSize(s)}
                    >
                      <span style={{ fontSize: 11 + i * 5, lineHeight: 1 }}>A</span>
                    </button>
                  ))
                : INK_WIDTHS.map((w, i) => (
                    <button
                      key={w}
                      className={`icon-btn${penWidth === w ? ' is-active' : ''}`}
                      onClick={() => setPenWidth(w)}
                    >
                      <span
                        className="annotate-dot"
                        style={{ width: 4 + i * 4, height: 4 + i * 4, background: penColor }}
                      />
                    </button>
                  ))}
            </div>

            <div className="menu__sep" />
            <button
              className="menu__item"
              onClick={() => {
                setTool('none')
                setOpen(false)
              }}
            >
              {m.exitAnnotate}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

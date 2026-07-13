import { useStore } from '../../store/useStore'
import { HIGHLIGHT_COLORS, type Annotation, type HighlightColor } from '../../types'
import { colorVar, newId } from '../../lib/highlights'
import { useMessages } from '../../hooks/useMessages'
import { IconCopy, IconNote, IconTranslate } from '../icons'

/**
 * The floating toolbar shown over a fresh text selection. Rendered inside the
 * page element that matches pendingSelection.page, positioned at its anchor.
 */
export function SelectionToolbar() {
  const m = useMessages()
  const sel = useStore((s) => s.pendingSelection)
  const defaultColor = useStore((s) => s.defaultColor)
  const addAnnotation = useStore((s) => s.addAnnotation)
  const setPendingSelection = useStore((s) => s.setPendingSelection)
  const setDefaultColor = useStore((s) => s.setDefaultColor)
  const setPanel = useStore((s) => s.setPanel)
  const setEditingNoteId = useStore((s) => s.setEditingNoteId)
  const setTranslateInput = useStore((s) => s.setTranslateInput)

  if (!sel) return null

  function makeAnnotation(color: HighlightColor, withNote: boolean) {
    if (!sel) return
    const now = Date.now()
    const a: Annotation = {
      id: newId(),
      page: sel.page,
      color,
      text: sel.text,
      note: withNote ? '' : undefined,
      rects: sel.rects,
      createdAt: now,
      updatedAt: now,
    }
    addAnnotation(a)
    setPendingSelection(null)
    window.getSelection()?.removeAllRanges()
    if (withNote) {
      setPanel('notes')
      setEditingNoteId(a.id)
    }
  }

  return (
    <div
      className="selection-toolbar"
      style={{ left: sel.anchor.left, top: Math.max(sel.anchor.top - 8, 4) }}
      onMouseDown={(e) => e.preventDefault() /* keep the selection alive */}
      onClick={(e) => e.stopPropagation()}
    >
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c}
          className={`color-swatch${c === defaultColor ? ' is-active' : ''}`}
          style={{ background: colorVar(c) }}
          title={c}
          aria-label={c}
          onClick={() => {
            setDefaultColor(c)
            makeAnnotation(c, false)
          }}
        />
      ))}
      <button
        className="icon-btn"
        title={m.addNote}
        aria-label={m.addNote}
        onClick={() => makeAnnotation(defaultColor, true)}
      >
        <IconNote />
      </button>
      <button
        className="icon-btn"
        title={m.translate}
        aria-label={m.translate}
        onClick={() => {
          setTranslateInput(sel.text)
          setPanel('translate')
          setPendingSelection(null)
          window.getSelection()?.removeAllRanges()
        }}
      >
        <IconTranslate />
      </button>
      <button
        className="icon-btn"
        title={m.copyText}
        aria-label={m.copyText}
        onClick={() => {
          navigator.clipboard?.writeText(sel.text).catch(() => {})
          setPendingSelection(null)
          window.getSelection()?.removeAllRanges()
        }}
      >
        <IconCopy />
      </button>
    </div>
  )
}

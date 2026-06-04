import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { useMessages } from '../../hooks/useMessages'
import { colorVar } from '../../lib/highlights'
import { exportMarkdown, downloadTextFile } from '../../lib/sidecar'
import type { Annotation } from '../../types'
import { IconDownload, IconEdit, IconTrash } from '../icons'

function NoteCard({ a }: { a: Annotation }) {
  const m = useMessages()
  const updateAnnotation = useStore((s) => s.updateAnnotation)
  const removeAnnotation = useStore((s) => s.removeAnnotation)
  const requestScroll = useStore((s) => s.requestScroll)
  const editingNoteId = useStore((s) => s.editingNoteId)
  const setEditingNoteId = useStore((s) => s.setEditingNoteId)

  const editing = editingNoteId === a.id
  const [draft, setDraft] = useState(a.note ?? '')
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(a.note ?? '')
      taRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  function jump() {
    const el = document.getElementById(`pdf-page-${a.page}`)
    const y = el && a.rects[0] ? a.rects[0].y * el.clientHeight : 0
    requestScroll(a.page, Math.max(0, y - 80))
  }

  return (
    <div className="note-card" data-note-id={a.id}>
      <div className="note-card__top">
        <span className="note-card__dot" style={{ background: colorVar(a.color) }} />
        <button className="note-card__page" onClick={jump} title={m.jumpTo}>
          {m.onPage(a.page)}
        </button>
        <span className="note-card__actions">
          <button
            className="icon-btn"
            title={m.edit}
            onClick={() => setEditingNoteId(editing ? null : a.id)}
          >
            <IconEdit width={15} height={15} />
          </button>
          <button
            className="icon-btn"
            title={m.delete}
            onClick={() => {
              if (window.confirm(m.confirmDelete)) removeAnnotation(a.id)
            }}
          >
            <IconTrash width={15} height={15} />
          </button>
        </span>
      </div>

      {a.text && (
        <div className="note-card__quote" onClick={jump}>
          {a.text}
        </div>
      )}

      {editing ? (
        <>
          <textarea
            ref={taRef}
            value={draft}
            placeholder={m.notePlaceholder}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="note-card__editbtns">
            <button className="btn-secondary" onClick={() => setEditingNoteId(null)}>
              {m.cancel}
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                updateAnnotation(a.id, { note: draft.trim() || undefined })
                setEditingNoteId(null)
              }}
            >
              {m.save}
            </button>
          </div>
        </>
      ) : a.note ? (
        <div className="note-card__note">{a.note}</div>
      ) : (
        <button
          className="search-result"
          style={{ color: 'var(--fg-muted)', paddingLeft: 0 }}
          onClick={() => setEditingNoteId(a.id)}
        >
          + {m.addNote}
        </button>
      )}
    </div>
  )
}

export function NotesPanel() {
  const m = useMessages()
  const annotations = useStore((s) => s.annotations)
  const bookmarks = useStore((s) => s.bookmarks)
  const doc = useStore((s) => s.doc)

  const sorted = [...annotations].sort(
    (a, b) => a.page - b.page || (a.rects[0]?.y ?? 0) - (b.rects[0]?.y ?? 0),
  )

  return (
    <div>
      {annotations.length > 0 && doc && (
        <div style={{ display: 'flex', marginBottom: 10 }}>
          <button
            className="btn-secondary"
            style={{ marginLeft: 'auto', padding: '6px 10px' }}
            onClick={() =>
              downloadTextFile(
                `${doc.name.replace(/\.pdf$/i, '')}.md`,
                exportMarkdown(doc, annotations, bookmarks),
              )
            }
          >
            <IconDownload width={15} height={15} />
            {m.exportNotes}
          </button>
        </div>
      )}
      {sorted.length === 0 ? (
        <div className="empty-hint">{m.noNotes}</div>
      ) : (
        sorted.map((a) => <NoteCard key={a.id} a={a} />)
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { useMessages } from '../../hooks/useMessages'
import { colorVar, newId } from '../../lib/highlights'
import { exportMarkdown, downloadTextFile } from '../../lib/sidecar'
import type { Annotation, Note } from '../../types'
import { IconDownload, IconEdit, IconNote, IconTrash } from '../icons'

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

/** A standalone note (vocabulary / free note, not tied to a selection). */
function NoteFreeCard({ n }: { n: Note }) {
  const m = useMessages()
  const updateNote = useStore((s) => s.updateNote)
  const removeNote = useStore((s) => s.removeNote)
  const requestScroll = useStore((s) => s.requestScroll)
  const editingNoteId = useStore((s) => s.editingNoteId)
  const setEditingNoteId = useStore((s) => s.setEditingNoteId)

  const editing = editingNoteId === n.id
  const [draft, setDraft] = useState(n.text)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(n.text)
      taRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  return (
    <div className="note-card" data-note-id={n.id}>
      <div className="note-card__top">
        <span className="note-card__dot" style={{ background: 'var(--accent)' }} />
        {n.page ? (
          <button className="note-card__page" onClick={() => requestScroll(n.page!)} title={m.jumpTo}>
            {m.onPage(n.page)}
          </button>
        ) : (
          <span className="note-card__page">{m.newNote}</span>
        )}
        <span className="note-card__actions">
          <button
            className="icon-btn"
            title={m.edit}
            onClick={() => setEditingNoteId(editing ? null : n.id)}
          >
            <IconEdit width={15} height={15} />
          </button>
          <button
            className="icon-btn"
            title={m.delete}
            onClick={() => {
              if (window.confirm(m.confirmDeleteNote)) removeNote(n.id)
            }}
          >
            <IconTrash width={15} height={15} />
          </button>
        </span>
      </div>

      {editing ? (
        <>
          <textarea
            ref={taRef}
            value={draft}
            placeholder={m.notePlaceholder}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="note-card__editbtns">
            <button
              className="btn-secondary"
              onClick={() => {
                if (!n.text.trim()) removeNote(n.id) // discard an unsaved empty note
                setEditingNoteId(null)
              }}
            >
              {m.cancel}
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                if (!draft.trim()) removeNote(n.id)
                else updateNote(n.id, { text: draft.trim() })
                setEditingNoteId(null)
              }}
            >
              {m.save}
            </button>
          </div>
        </>
      ) : (
        <div className="note-card__note">{n.text}</div>
      )}
    </div>
  )
}

export function NotesPanel() {
  const m = useMessages()
  const annotations = useStore((s) => s.annotations)
  const notes = useStore((s) => s.notes)
  const bookmarks = useStore((s) => s.bookmarks)
  const doc = useStore((s) => s.doc)
  const currentPage = useStore((s) => s.currentPage)
  const addNote = useStore((s) => s.addNote)
  const setEditingNoteId = useStore((s) => s.setEditingNoteId)

  const sortedAnnots = [...annotations].sort(
    (a, b) => a.page - b.page || (a.rects[0]?.y ?? 0) - (b.rects[0]?.y ?? 0),
  )
  const sortedNotes = [...notes].sort((a, b) => b.createdAt - a.createdAt) // newest first
  const empty = sortedAnnots.length === 0 && sortedNotes.length === 0

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button
          className="btn-secondary"
          style={{ padding: '6px 10px' }}
          onClick={() => {
            const id = newId()
            const now = Date.now()
            addNote({ id, text: '', page: currentPage, createdAt: now, updatedAt: now })
            setEditingNoteId(id)
          }}
        >
          <IconNote width={15} height={15} />
          {m.newNote}
        </button>
        {!empty && doc && (
          <button
            className="btn-secondary"
            style={{ marginLeft: 'auto', padding: '6px 10px' }}
            onClick={() =>
              downloadTextFile(
                `${doc.name.replace(/\.pdf$/i, '')}.md`,
                exportMarkdown(doc, annotations, bookmarks, notes),
              )
            }
          >
            <IconDownload width={15} height={15} />
            {m.exportNotes}
          </button>
        )}
      </div>
      {empty ? (
        <div className="empty-hint">{m.noNotes}</div>
      ) : (
        <>
          {sortedNotes.map((n) => (
            <NoteFreeCard key={n.id} n={n} />
          ))}
          {sortedAnnots.map((a) => (
            <NoteCard key={a.id} a={a} />
          ))}
        </>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useMessages } from '../../hooks/useMessages'
import type { Bookmark } from '../../types'
import { IconBookmarkFilled, IconCheck, IconEdit, IconTrash } from '../icons'

function Row({ b }: { b: Bookmark }) {
  const m = useMessages()
  const requestScroll = useStore((s) => s.requestScroll)
  const removeBookmark = useStore((s) => s.removeBookmark)
  const updateBookmark = useStore((s) => s.updateBookmark)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(b.label ?? '')

  function save() {
    updateBookmark(b.id, { label: draft.trim() || undefined })
    setEditing(false)
  }

  return (
    <div className="note-card">
      <div className="note-card__top">
        <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
          <IconBookmarkFilled width={14} height={14} />
        </span>
        <button className="note-card__page" onClick={() => requestScroll(b.page)} title={m.jumpTo}>
          {m.onPage(b.page)}
        </button>
        <span className="note-card__actions">
          <button
            className="icon-btn"
            title={m.edit}
            onClick={() => {
              setDraft(b.label ?? '')
              setEditing((v) => !v)
            }}
          >
            <IconEdit width={15} height={15} />
          </button>
          <button
            className="icon-btn"
            title={m.removeBookmark}
            onClick={() => removeBookmark(b.id)}
          >
            <IconTrash width={15} height={15} />
          </button>
        </span>
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <input
            autoFocus
            value={draft}
            placeholder={m.bookmarkLabelPlaceholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') setEditing(false)
            }}
            style={{
              flex: 1,
              background: 'var(--bg)',
              color: 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 8px',
            }}
          />
          <button className="icon-btn" title={m.save} onClick={save}>
            <IconCheck width={16} height={16} />
          </button>
        </div>
      ) : (
        b.label && <div className="note-card__note">{b.label}</div>
      )}
    </div>
  )
}

export function BookmarksPanel() {
  const m = useMessages()
  const bookmarks = useStore((s) => s.bookmarks)
  const sorted = [...bookmarks].sort((a, b) => a.page - b.page)

  if (sorted.length === 0) return <div className="empty-hint">{m.noBookmarks}</div>
  return (
    <div>
      {sorted.map((b) => (
        <Row key={b.id} b={b} />
      ))}
    </div>
  )
}

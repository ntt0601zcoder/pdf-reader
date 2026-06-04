import { useStore } from '../../store/useStore'
import { useMessages } from '../../hooks/useMessages'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { IconClose } from '../icons'
import { OutlinePanel } from './OutlinePanel'
import { SearchPanel } from './SearchPanel'
import { NotesPanel } from './NotesPanel'
import { BookmarksPanel } from './BookmarksPanel'

export function Sidebar() {
  const m = useMessages()
  const panel = useStore((s) => s.panel)
  const setPanel = useStore((s) => s.setPanel)
  const narrow = useMediaQuery('(max-width: 760px)')

  if (!panel) return null

  const title =
    panel === 'outline'
      ? m.outlineTitle
      : panel === 'search'
        ? m.toggleSearch
        : panel === 'bookmarks'
          ? m.bookmarksTitle
          : m.notesTitle

  return (
    <>
      {narrow && <div className="sidebar-backdrop" onClick={() => setPanel(null)} />}
      <aside className="sidebar">
        <div className="sidebar__header">
        <span>{title}</span>
        <button className="icon-btn" onClick={() => setPanel(null)} aria-label={m.closeDoc}>
          <IconClose width={16} height={16} />
        </button>
      </div>
        <div className="sidebar__body">
          {panel === 'outline' && <OutlinePanel />}
          {panel === 'search' && <SearchPanel />}
          {panel === 'bookmarks' && <BookmarksPanel />}
          {panel === 'notes' && <NotesPanel />}
        </div>
      </aside>
    </>
  )
}

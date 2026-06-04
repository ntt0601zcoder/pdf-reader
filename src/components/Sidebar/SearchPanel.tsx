import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useStore } from '../../store/useStore'
import { useMessages } from '../../hooks/useMessages'
import { searchInIndex } from '../../lib/pdf/search'
import { IconChevronLeft, IconChevronRight } from '../icons'

/** Highlight occurrences of `query` inside `snippet`. */
function mark(snippet: string, query: string): ReactNode {
  const q = query.trim()
  if (!q) return snippet
  const out: ReactNode[] = []
  const lower = snippet.toLowerCase()
  const needle = q.toLowerCase()
  let from = 0
  let idx = lower.indexOf(needle, from)
  let key = 0
  while (idx !== -1) {
    if (idx > from) out.push(snippet.slice(from, idx))
    out.push(<mark key={key++}>{snippet.slice(idx, idx + needle.length)}</mark>)
    from = idx + needle.length
    idx = lower.indexOf(needle, from)
  }
  out.push(snippet.slice(from))
  return out
}

export function SearchPanel() {
  const m = useMessages()
  const index = useStore((s) => s.searchIndex)
  const searching = useStore((s) => s.searching)
  const matches = useStore((s) => s.searchMatches)
  const activeIndex = useStore((s) => s.searchActiveIndex)
  const query = useStore((s) => s.searchQuery)
  const setSearchQuery = useStore((s) => s.setSearchQuery)
  const setSearchResults = useStore((s) => s.setSearchResults)
  const setSearchActiveIndex = useStore((s) => s.setSearchActiveIndex)

  const [text, setText] = useState(query)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced search; re-runs when the index finishes building.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(text)
      const res = text.trim().length >= 2 ? searchInIndex(index, text) : []
      setSearchResults(res)
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, index])

  const step = (delta: number) => {
    if (!matches.length) return
    const next = (activeIndex + delta + matches.length) % matches.length
    setSearchActiveIndex(next)
  }

  return (
    <div>
      <div className="search-box">
        <input
          ref={inputRef}
          value={text}
          placeholder={m.searchPlaceholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') step(e.shiftKey ? -1 : 1)
          }}
        />
      </div>

      {searching ? (
        <div className="empty-hint">{m.searching}</div>
      ) : text.trim().length >= 2 && matches.length === 0 ? (
        <div className="empty-hint">{m.noResults}</div>
      ) : matches.length > 0 ? (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              margin: '4px 2px 10px',
              color: 'var(--fg-muted)',
              fontSize: 12,
            }}
          >
            <span>
              {activeIndex >= 0 ? `${activeIndex + 1} / ` : ''}
              {m.resultsCount(matches.length)}
            </span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
              <button className="icon-btn" onClick={() => step(-1)} aria-label="prev">
                <IconChevronLeft />
              </button>
              <button className="icon-btn" onClick={() => step(1)} aria-label="next">
                <IconChevronRight />
              </button>
            </span>
          </div>
          {matches.map((mm, i) => (
            <button
              key={`${mm.page}_${mm.index}`}
              className={`search-result${i === activeIndex ? ' is-active' : ''}`}
              onClick={() => setSearchActiveIndex(i)}
            >
              <div className="search-result__page">{m.onPage(mm.page)}</div>
              <div>{mark(mm.snippet, text)}</div>
            </button>
          ))}
        </>
      ) : null}
    </div>
  )
}

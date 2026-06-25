import { useEffect, useRef, useState } from 'react'
import { useMessages } from '../hooks/useMessages'
import { isGoogleConfigured } from '../lib/google/config'
import { openFromDrive, openLocalFile, openRecent } from '../lib/docOpener'
import { deleteDoc, listRecentDocs } from '../lib/idb'
import type { DocMeta } from '../types'
import { IconDrive, IconFile, IconBook, IconTrash, IconStar } from './icons'

export function Welcome() {
  const m = useMessages()
  const configured = isGoogleConfigured()
  const fileInput = useRef<HTMLInputElement>(null)
  const [recent, setRecent] = useState<DocMeta[]>([])
  const [dragover, setDragover] = useState(false)

  async function refreshRecent() {
    setRecent(await listRecentDocs(12).catch(() => []))
  }
  useEffect(() => {
    void refreshRecent()
  }, [])

  function onPickLocal(files: FileList | null) {
    const f = files?.[0]
    if (f && f.type === 'application/pdf') void openLocalFile(f)
  }

  return (
    <div
      className={`welcome${dragover ? ' is-dragover' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragover(true)
      }}
      onDragLeave={() => setDragover(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragover(false)
        onPickLocal(e.dataTransfer.files)
      }}
    >
      <div className="welcome__logo">
        <IconBook width={48} height={48} />
      </div>
      <h1 className="welcome__title">{m.appName}</h1>
      <p className="welcome__tagline">{m.tagline}</p>

      <div className="welcome__actions">
        <button
          className="btn-primary"
          disabled={!configured}
          onClick={() => void openFromDrive()}
        >
          <IconDrive />
          {m.openFromDrive}
        </button>
        <button className="btn-secondary" onClick={() => fileInput.current?.click()}>
          <IconFile />
          {m.openLocal}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => onPickLocal(e.target.files)}
        />
      </div>

      <p className="welcome__hint">{m.dropHint}</p>

      <a
        className="welcome__github"
        href="https://github.com/ntt0601zcoder/pdf-reader"
        target="_blank"
        rel="noopener noreferrer"
      >
        <IconStar width={16} height={16} className="welcome__star" />
        {m.starOnGithub}
      </a>

      {!configured && <div className="welcome__warn">{m.notConfigured}</div>}

      {recent.length > 0 && (
        <div className="recent">
          <div className="recent__title">{m.recentFiles}</div>
          {recent.map((d) => (
            <div key={d.id} className="recent__item" onClick={() => void openRecent(d)}>
              {d.source === 'drive' ? (
                <IconDrive width={16} height={16} />
              ) : (
                <IconFile width={16} height={16} />
              )}
              <span className="recent__name">{d.name}</span>
              <span className="recent__meta">
                {new Date(d.lastOpened).toLocaleDateString()}
              </span>
              <button
                className="recent__del"
                title={m.delete}
                onClick={(e) => {
                  e.stopPropagation()
                  void deleteDoc(d.id).then(refreshRecent)
                }}
              >
                <IconTrash width={15} height={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

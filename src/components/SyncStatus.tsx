import { useStore } from '../store/useStore'
import { useMessages } from '../hooks/useMessages'
import { flushNow } from '../lib/storage'

export function SyncStatus() {
  const status = useStore((s) => s.syncStatus)
  const m = useMessages()

  if (status === 'idle') return null

  const label =
    status === 'saving'
      ? m.syncSaving
      : status === 'saved'
        ? m.syncSaved
        : status === 'local'
          ? m.syncLocal
          : m.syncError

  const cls = `sync-pill${status === 'saving' ? ' is-saving' : ''}${
    status === 'error' ? ' is-error' : ''
  }`

  return (
    <span
      className={cls}
      role={status === 'error' ? 'button' : undefined}
      onClick={status === 'error' ? () => void flushNow() : undefined}
      title={status === 'error' ? m.syncRetry : undefined}
    >
      <span className="sync-dot" />
      <span className="sync-pill__label">{label}</span>
    </span>
  )
}

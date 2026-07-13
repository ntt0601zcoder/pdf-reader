import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { useMessages } from '../../hooks/useMessages'
import { translateText, googleTranslateUrl } from '../../lib/translate'
import { IconCopy } from '../icons'

/**
 * Inline dictionary / translator. Fed either by the "Translate" action on a
 * selection, or by typing any word — so it works on scanned PDFs too. Auto-
 * translates (debounced) via the free endpoints in lib/translate.
 */
export function TranslatePanel() {
  const m = useMessages()
  const input = useStore((s) => s.translateInput)
  const setInput = useStore((s) => s.setTranslateInput)
  const target = useStore((s) => s.translateTarget)
  const setTarget = useStore((s) => s.setTranslateTarget)

  const [result, setResult] = useState('')
  const [source, setSource] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-translate (debounced) whenever the text or target changes.
  useEffect(() => {
    const q = input.trim()
    if (!q) {
      setResult('')
      setError(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    let cancelled = false
    const t = setTimeout(() => {
      translateText(q, target)
        .then((r) => {
          if (cancelled) return
          setResult(r.text)
          setSource(r.source)
        })
        .catch(() => {
          if (!cancelled) setError(true)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 450)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [input, target])

  return (
    <div className="translate-panel">
      <div className="translate-panel__langs">
        <span className="translate-panel__src">{source ? source.toUpperCase() : 'auto'} →</span>
        <button
          className={`chip${target === 'vi' ? ' is-active' : ''}`}
          onClick={() => setTarget('vi')}
        >
          Tiếng Việt
        </button>
        <button
          className={`chip${target === 'en' ? ' is-active' : ''}`}
          onClick={() => setTarget('en')}
        >
          English
        </button>
      </div>

      <textarea
        ref={inputRef}
        className="translate-panel__input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={m.translatePlaceholder}
        rows={2}
      />

      <div className="translate-panel__result">
        {loading ? (
          <div className="spinner" />
        ) : error ? (
          <div className="translate-panel__err">
            {m.translateError}{' '}
            <a href={googleTranslateUrl(input, target)} target="_blank" rel="noopener noreferrer">
              Google
            </a>
          </div>
        ) : result ? (
          <>
            <div className="translate-panel__text">{result}</div>
            <button
              className="icon-btn icon-btn--labeled"
              onClick={() => navigator.clipboard?.writeText(result).catch(() => {})}
            >
              <IconCopy width={15} height={15} />
              {m.copyText}
            </button>
          </>
        ) : (
          <div className="empty-hint">{m.translateHint}</div>
        )}
      </div>
    </div>
  )
}

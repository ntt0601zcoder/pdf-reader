// =============================================================================
// On-selection translation. Frontend-only, no API key:
//   1) Google's public (unofficial) translate endpoint — best quality, auto
//      source detection.
//   2) MyMemory as a CORS-safe fallback (for en <-> vi) if Google is blocked.
// Both are best-effort; a failure surfaces a "open Google Translate" link.
// =============================================================================

export interface TranslateResult {
  text: string
  /** Detected source language code, if known. */
  source?: string
}

const MAX_LEN = 1500

export async function translateText(text: string, target: string): Promise<TranslateResult> {
  const q = text.trim().slice(0, MAX_LEN)
  if (!q) return { text: '' }

  // 1) Google public endpoint (auto-detect source).
  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto' +
      `&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(q)}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data?.[0])) {
        const out = data[0]
          .map((seg: unknown) => (Array.isArray(seg) ? String(seg[0] ?? '') : ''))
          .join('')
        if (out.trim()) {
          return { text: out, source: typeof data[2] === 'string' ? data[2] : undefined }
        }
      }
    }
  } catch {
    /* fall through to MyMemory */
  }

  // 2) MyMemory fallback (no auto-detect; guess the opposite of the target).
  try {
    const source = target === 'vi' ? 'en' : 'vi'
    const url =
      'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(q) +
      `&langpair=${source}|${target}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      const t = data?.responseData?.translatedText
      if (typeof t === 'string' && t.trim()) return { text: t, source }
    }
  } catch {
    /* fall through */
  }

  throw new Error('translate_failed')
}

/** Google Translate web URL, used as a graceful fallback link. */
export function googleTranslateUrl(text: string, target: string): string {
  return (
    'https://translate.google.com/?sl=auto&op=translate' +
    `&tl=${encodeURIComponent(target)}&text=${encodeURIComponent(text.slice(0, MAX_LEN))}`
  )
}

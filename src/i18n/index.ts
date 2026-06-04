import { MESSAGES, type Messages } from './messages'
import type { Lang } from '../types'

export { MESSAGES }
export type { Messages }

/** Resolve the message table for a language. */
export function getMessages(lang: Lang): Messages {
  return MESSAGES[lang]
}

/** Detect a sensible default language from the browser. */
export function detectLang(): Lang {
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')) {
    return 'en'
  }
  return 'vi'
}

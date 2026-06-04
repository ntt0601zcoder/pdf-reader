import { useStore } from '../store/useStore'
import { getMessages, type Messages } from '../i18n'

/** Reactive access to the localized message table. */
export function useMessages(): Messages {
  const lang = useStore((s) => s.lang)
  return getMessages(lang)
}

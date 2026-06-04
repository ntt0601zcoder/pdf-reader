import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/** Keep <html data-theme> + <html lang> in sync with the store. */
export function useTheme(): void {
  const theme = useStore((s) => s.theme)
  const lang = useStore((s) => s.lang)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
  }, [lang])
}

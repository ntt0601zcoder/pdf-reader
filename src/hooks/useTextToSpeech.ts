import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { getPageText } from '../lib/pdf/getPageText'
import type { TtsState } from '../types'

export interface TtsApi {
  state: TtsState
  supported: boolean
  /** Play (from current page) / pause / resume depending on state. */
  toggle: () => void
  stop: () => void
  rate: number
  setRate: (r: number) => void
  voices: SpeechSynthesisVoice[]
  voiceURI: string | null
  setVoiceURI: (uri: string | null) => void
}

/**
 * Read-aloud engine over the Web Speech API. Reads the current page's text,
 * then advances to the next page (scroll + speak) on each utterance end. The
 * PDF proxy is read from the store (so the sibling Toolbar can drive it without
 * crossing the PdfContext boundary). Page advance is derived from the engine's
 * OWN counter, never from currentPage, so the page-tracking IntersectionObserver
 * can't make it skip or rewind. Mutually exclusive with auto-scroll.
 */
export function useTextToSpeech(): TtsApi {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const ttsState = useStore((s) => s.ttsState)
  const setTtsState = useStore((s) => s.setTtsState)
  const rate = useStore((s) => s.ttsRate)
  const setRate = useStore((s) => s.setTtsRate)
  const voiceURI = useStore((s) => s.ttsVoiceURI)
  const setVoiceURI = useStore((s) => s.setTtsVoiceURI)
  const pdf = useStore((s) => s.pdfDoc)
  const autoScroll = useStore((s) => s.autoScroll)

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const sessionRef = useRef(0) // bumps on every stop — invalidates stale onend callbacks

  // Voices load asynchronously in Chrome.
  useEffect(() => {
    if (!supported) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [supported])

  const stop = useCallback(() => {
    if (!supported) return
    sessionRef.current++ // invalidate any in-flight onend
    window.speechSynthesis.cancel()
    setTtsState('idle')
  }, [supported, setTtsState])

  const speakPage = useCallback(
    async (pageNumber: number, session: number) => {
      if (!pdf || !supported) return
      const numPages = useStore.getState().numPages
      if (pageNumber > numPages) {
        stop()
        return
      }
      let text = ''
      try {
        text = await getPageText(pdf, pageNumber)
      } catch {
        /* skip unreadable page */
      }
      if (session !== sessionRef.current) return // stopped while extracting
      if (!text.trim()) {
        // Empty page — advance without speaking.
        const next = pageNumber + 1
        if (next > numPages) {
          stop()
          return
        }
        useStore.getState().setCurrentPage(next)
        useStore.getState().requestScroll(next)
        return speakPage(next, session)
      }
      const u = new SpeechSynthesisUtterance(text)
      u.rate = useStore.getState().ttsRate
      const v = useStore.getState().ttsVoiceURI
      if (v) {
        const found = window.speechSynthesis.getVoices().find((x) => x.voiceURI === v)
        if (found) u.voice = found
      }
      u.onend = () => {
        if (session !== sessionRef.current) return
        const next = pageNumber + 1
        if (next > useStore.getState().numPages) {
          stop()
          return
        }
        useStore.getState().setCurrentPage(next)
        useStore.getState().requestScroll(next)
        speakPage(next, session)
      }
      u.onerror = () => {
        if (session === sessionRef.current) stop()
      }
      window.speechSynthesis.cancel() // never queue/double-speak
      window.speechSynthesis.speak(u)
    },
    [pdf, supported, stop],
  )

  const play = useCallback(() => {
    if (!supported || !pdf) return
    useStore.getState().setAutoScroll(false) // mutually exclusive with auto-scroll
    sessionRef.current++
    window.speechSynthesis.cancel()
    const session = sessionRef.current
    setTtsState('playing')
    speakPage(useStore.getState().currentPage, session)
  }, [supported, pdf, setTtsState, speakPage])

  const toggle = useCallback(() => {
    if (ttsState === 'playing') {
      window.speechSynthesis.pause()
      setTtsState('paused')
    } else if (ttsState === 'paused') {
      window.speechSynthesis.resume()
      setTtsState('playing')
    } else {
      play()
    }
  }, [ttsState, play, setTtsState])

  // Restart the current page when rate changes mid-playback (an utterance's
  // rate is fixed once it starts).
  useEffect(() => {
    if (useStore.getState().ttsState === 'playing') play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate])

  // Auto-scroll starting takes over — stop reading.
  useEffect(() => {
    if (autoScroll && useStore.getState().ttsState !== 'idle') stop()
  }, [autoScroll, stop])

  // Stop when the document/proxy changes or the component unmounts.
  useEffect(() => () => stop(), [pdf, stop])

  return { state: ttsState, supported, toggle, stop, rate, setRate, voices, voiceURI, setVoiceURI }
}

import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { newId } from '../lib/highlights'

/** Focus an element (by selector) after the panel it lives in has mounted. */
function focusLater(selector: string) {
  setTimeout(() => document.querySelector<HTMLElement>(selector)?.focus(), 60)
}

/**
 * Global single-key shortcuts. They fire only while NOT typing in a field (so
 * text input / Cut / Copy keep working) and preventDefault so they override any
 * browser default. One handler owns all of them, so there are no collisions.
 *
 *   /  search      d  translate      n  new note
 *   p  pen         t  text           e  eraser        Esc  exit / close
 */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore key-repeat and in-progress IME composition (so Esc still cancels
      // a Vietnamese/CJK composition rather than closing a panel).
      if (e.repeat || e.isComposing) return

      const s = useStore.getState()

      // Escape unwinds whatever is active — handled even from a focused field so
      // you can close what a shortcut just opened.
      if (e.key === 'Escape') {
        const ae = document.activeElement as HTMLElement | null
        if (ae && ae.classList.contains('annotate-text')) {
          ae.blur() // commit the annotate text box being edited
        } else if (s.editingNoteId) {
          // Cancel a note edit; discard it if left empty (e.g. from `n`).
          const note = s.notes.find((n) => n.id === s.editingNoteId)
          if (note && !note.text.trim()) s.removeNote(s.editingNoteId)
          s.setEditingNoteId(null)
          ae?.blur?.()
        } else if (s.tool !== 'none') s.setTool('none')
        else if (s.pendingSelection) s.setPendingSelection(null)
        else if (s.panel) {
          s.setPanel(null)
          ae?.blur?.()
        } else if (s.refOpen) s.closeRef()
        else return
        e.preventDefault()
        return
      }

      // The letter/slash shortcuts must never fire while typing in a field.
      const el = e.target as HTMLElement | null
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      ) {
        return
      }

      // The rest need a document and no modifier (plain key press).
      if (!s.doc || e.metaKey || e.ctrlKey || e.altKey) return

      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      switch (k) {
        case '/':
          e.preventDefault()
          s.setPanel('search')
          focusLater('.search-box input')
          break
        case 'd': {
          e.preventDefault()
          // Translate the current selection if there is one, else open empty.
          const sel = window.getSelection()?.toString().trim()
          if (sel) s.setTranslateInput(sel)
          s.setPanel('translate')
          focusLater('.translate-panel__input')
          break
        }
        case 'n': {
          e.preventDefault()
          s.setPanel('notes')
          const now = Date.now()
          const id = newId()
          s.addNote({ id, text: '', page: s.currentPage, createdAt: now, updatedAt: now })
          s.setEditingNoteId(id)
          break
        }
        case 'p':
          e.preventDefault()
          s.setTool(s.tool === 'ink' ? 'none' : 'ink')
          break
        case 't':
          e.preventDefault()
          s.setTool(s.tool === 'text' ? 'none' : 'text')
          break
        case 'e':
          e.preventDefault()
          s.setTool(s.tool === 'eraser' ? 'none' : 'eraser')
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

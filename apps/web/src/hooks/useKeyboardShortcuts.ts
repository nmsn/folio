import { useEffect } from 'react'

export interface ShortcutHandlers {
  onNext?: () => void
  onPrev?: () => void
  onToggleStar?: () => void
  onMarkRead?: () => void
  onToggleAI?: () => void
}

/**
 * 全局键盘快捷键：j/k 上下篇、s 收藏、m 已读、⌘. AI 切换。
 * 在 input/textarea/contenteditable 焦点时不触发。
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return
      }
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        handlers.onNext?.()
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        handlers.onPrev?.()
      } else if (e.key === 's') {
        e.preventDefault()
        handlers.onToggleStar?.()
      } else if (e.key === 'm') {
        e.preventDefault()
        handlers.onMarkRead?.()
      } else if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        handlers.onToggleAI?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlers])
}

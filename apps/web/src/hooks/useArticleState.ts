import { useCallback, useEffect, useState } from 'react'

const KEY = 'folio.articleState.v1'

interface ArticleState {
  read: boolean
  starred: boolean
}

type StateMap = Record<string, ArticleState>

function loadFromStorage(): StateMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StateMap) : {}
  } catch {
    return {}
  }
}

function saveToStorage(state: StateMap) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // localStorage 不可用（隐私模式 / 配额满）—— 静默失败，状态仅保留在内存
  }
}

/**
 * 客户端管理 article 的 read / starred 状态，localStorage 持久化。
 * 未来如需同步后端：替换 saveToStorage 即可。
 */
export function useArticleState() {
  const [state, setState] = useState<StateMap>(loadFromStorage)

  // 跨 tab 同步
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          setState(JSON.parse(e.newValue) as StateMap)
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isRead = useCallback((id: string) => Boolean(state[id]?.read), [state])
  const isStarred = useCallback((id: string) => Boolean(state[id]?.starred), [state])

  const markRead = useCallback((id: string) => {
    setState((prev) => {
      const next = {
        ...prev,
        [id]: { ...(prev[id] ?? { read: false, starred: false }), read: true },
      }
      saveToStorage(next)
      return next
    })
  }, [])

  const toggleStarred = useCallback((id: string) => {
    setState((prev) => {
      const cur = prev[id] ?? { read: false, starred: false }
      const next = { ...prev, [id]: { ...cur, starred: !cur.starred } }
      saveToStorage(next)
      return next
    })
  }, [])

  return { isRead, isStarred, markRead, toggleStarred }
}

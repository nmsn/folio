import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client, orpc } from '../lib/orpc'

const STAR_KEY = 'folio.articleStarred.v1'

type StarMap = Record<string, boolean>

function loadStars(): StarMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STAR_KEY)
    if (raw) return JSON.parse(raw) as StarMap

    // One-time migrate starred flags from legacy articleState blob
    const legacy = window.localStorage.getItem('folio.articleState.v1')
    if (!legacy) return {}
    const parsed = JSON.parse(legacy) as Record<string, { starred?: boolean }>
    const stars: StarMap = {}
    for (const [id, v] of Object.entries(parsed)) {
      if (v?.starred) stars[id] = true
    }
    if (Object.keys(stars).length) saveStars(stars)
    return stars
  } catch {
    return {}
  }
}

function saveStars(state: StarMap) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STAR_KEY, JSON.stringify(state))
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Read state from server (article_states); starred remains localStorage for this phase.
 */
export function useArticleState(articleIds: string[]) {
  const queryClient = useQueryClient()
  const stableIds = useMemo(() => [...articleIds].sort(), [articleIds.join(',')])

  const { data: states = {} } = useQuery({
    queryKey: ['articles', 'states', ...stableIds],
    queryFn: () => client.articles.states({ articleIds: stableIds }),
    enabled: stableIds.length > 0,
  })

  const markReadMutation = useMutation({
    mutationFn: (articleId: string) => client.articles.markRead({ articleId }),
    onMutate: async (articleId) => {
      await queryClient.cancelQueries({ queryKey: ['articles', 'states'] })
      const key = ['articles', 'states', ...stableIds]
      const prev = queryClient.getQueryData<Record<string, { isRead: boolean }>>(key)
      queryClient.setQueryData(key, {
        ...(prev ?? {}),
        [articleId]: { isRead: true },
      })
      return { prev, key }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(ctx.key, ctx.prev)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['articles', 'states'] })
    },
  })

  const [stars, setStars] = useState<StarMap>(loadStars)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (e: StorageEvent) => {
      if (e.key === STAR_KEY && e.newValue) {
        try {
          setStars(JSON.parse(e.newValue) as StarMap)
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isRead = useCallback((id: string) => Boolean(states[id]?.isRead), [states])

  const isStarred = useCallback((id: string) => Boolean(stars[id]), [stars])

  const markRead = useCallback(
    (id: string) => {
      if (states[id]?.isRead) return
      markReadMutation.mutate(id)
    },
    [markReadMutation, states],
  )

  const toggleStarred = useCallback((id: string) => {
    setStars((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      saveStars(next)
      return next
    })
  }, [])

  return { isRead, isStarred, markRead, toggleStarred }
}

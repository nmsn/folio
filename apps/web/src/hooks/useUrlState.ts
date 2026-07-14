import { useSearch, useNavigate, useLocation } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'

export type ViewMode = 'all' | 'unread' | 'starred'
export type SortBy = 'newest' | 'oldest'

export interface UrlState {
  view: ViewMode
  filter: boolean
  sort: SortBy
  feedId?: string
  category?: string
  articleId?: string
}

const DEFAULT_STATE: UrlState = {
  view: 'all',
  filter: false,
  sort: 'newest',
}

/**
 * Hook for syncing UI state with URL search params.
 * Supports: view mode, unread filter, sort order, selected feed/category/article
 */
export function useUrlState() {
  const search = useSearch({ from: '/_index' })
  const navigate = useNavigate({ from: '/_index' })
  const location = useLocation()

  const state = useMemo<UrlState>(
    () => ({
      view: (search.view as ViewMode) || DEFAULT_STATE.view,
      filter: search.filter === 'true',
      sort: (search.sort as SortBy) || DEFAULT_STATE.sort,
      feedId: search.feedId as string | undefined,
      category: search.category as string | undefined,
      articleId: search.articleId as string | undefined,
    }),
    [search],
  )

  const setState = useCallback(
    (updates: Partial<UrlState>) => {
      const newState = { ...state, ...updates }
      const cleanState = Object.fromEntries(
        Object.entries(newState).filter(([, v]) => v !== undefined),
      )

      navigate({
        search: cleanState,
        replace: false,
      })
    },
    [state, navigate],
  )

  const setView = useCallback(
    (view: ViewMode) => {
      setState({ view })
    },
    [setState],
  )

  const setFilter = useCallback(
    (filter: boolean) => {
      setState({ filter })
    },
    [setState],
  )

  const setSort = useCallback(
    (sort: SortBy) => {
      setState({ sort })
    },
    [setState],
  )

  const selectFeed = useCallback(
    (feedId: string | undefined) => {
      setState({ feedId, articleId: undefined })
    },
    [setState],
  )

  const selectCategory = useCallback(
    (category: string | undefined) => {
      setState({ category, feedId: undefined, articleId: undefined })
    },
    [setState],
  )

  const selectArticle = useCallback(
    (articleId: string | undefined) => {
      setState({ articleId })
    },
    [setState],
  )

  const clearSelection = useCallback(() => {
    setState({
      feedId: undefined,
      category: undefined,
      articleId: undefined,
    })
  }, [setState])

  return {
    ...state,
    setView,
    setFilter,
    setSort,
    selectFeed,
    selectCategory,
    selectArticle,
    clearSelection,
    setState,
    isViewingFeed: !!state.feedId,
    isViewingCategory: !!state.category,
    isViewingArticle: !!state.articleId,
    searchString: location.search,
  }
}

/**
 * Hook to get a shareable URL for the current state
 */
export function useShareableUrl(): string {
  const location = useLocation()
  return `${location.pathname}${location.search}`
}

/**
 * Hook to parse URL params on mount (for deep linking)
 * Returns the initial state from URL without causing re-renders
 */
export function useUrlStateOnMount(): UrlState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE
  }

  const params = new URLSearchParams(window.location.search)

  return {
    view: (params.get('view') as ViewMode) || DEFAULT_STATE.view,
    filter: params.get('filter') === 'true',
    sort: (params.get('sort') as SortBy) || DEFAULT_STATE.sort,
    feedId: params.get('feedId') || undefined,
    category: params.get('category') || undefined,
    articleId: params.get('articleId') || undefined,
  }
}

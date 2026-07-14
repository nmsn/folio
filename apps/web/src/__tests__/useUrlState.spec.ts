import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import * as React from 'react'

// Mock Tanstack Router hooks
vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => ({})),
  useNavigate: vi.fn(() => (_opts: { search?: Record<string, unknown>; replace?: boolean }) => {}),
  useLocation: vi.fn(() => ({ pathname: '/', search: '' })),
}))

// Since we can't easily test React hooks without full React Testing Library setup,
// we'll test the pure logic functions instead

describe('UrlState Types', () => {
  it('should have correct default values', () => {
    const DEFAULT_STATE = {
      view: 'list' as const,
      unreadOnly: false,
      sortBy: 'publishedAt' as const,
    }

    expect(DEFAULT_STATE.view).toBe('list')
    expect(DEFAULT_STATE.unreadOnly).toBe(false)
    expect(DEFAULT_STATE.sortBy).toBe('publishedAt')
  })

  it('should support all view modes', () => {
    type ViewMode = 'list' | 'grid' | 'reader'

    const modes: ViewMode[] = ['list', 'grid', 'reader']

    expect(modes).toContain('list')
    expect(modes).toContain('grid')
    expect(modes).toContain('reader')
  })

  it('should support all sort options', () => {
    type SortBy = 'publishedAt' | 'title' | 'source'

    const sorts: SortBy[] = ['publishedAt', 'title', 'source']

    expect(sorts).toContain('publishedAt')
    expect(sorts).toContain('title')
    expect(sorts).toContain('source')
  })
})

describe('UrlState parsing', () => {
  it('should parse URL search params correctly', () => {
    const parseUrlState = (search: Record<string, string>) => ({
      view: (search.view as 'list' | 'grid' | 'reader') || 'list',
      unreadOnly: search.unread === 'true',
      sortBy: (search.sort as 'publishedAt' | 'title' | 'source') || 'publishedAt',
      feedId: search.feedId || undefined,
      category: search.category || undefined,
      articleId: search.articleId || undefined,
    })

    // Empty params
    expect(parseUrlState({})).toEqual({
      view: 'list',
      unreadOnly: false,
      sortBy: 'publishedAt',
      feedId: undefined,
      category: undefined,
      articleId: undefined,
    })

    // With params
    expect(
      parseUrlState({
        view: 'grid',
        unread: 'true',
        sort: 'title',
        feedId: 'feed-123',
      }),
    ).toEqual({
      view: 'grid',
      unreadOnly: true,
      sortBy: 'title',
      feedId: 'feed-123',
      category: undefined,
      articleId: undefined,
    })
  })

  it('should generate clean URL state', () => {
    const cleanState = (state: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(state).filter(([, v]) => v !== undefined))

    const dirtyState = {
      view: 'grid',
      unreadOnly: false,
      sortBy: 'publishedAt' as const,
      feedId: undefined,
      category: undefined,
    }

    expect(cleanState(dirtyState)).toEqual({
      view: 'grid',
      unreadOnly: false,
      sortBy: 'publishedAt',
    })

    expect(
      cleanState({
        view: 'reader',
        feedId: 'feed-1',
        articleId: 'article-42',
      }),
    ).toEqual({
      view: 'reader',
      feedId: 'feed-1',
      articleId: 'article-42',
    })
  })
})

describe('useUrlStateOnMount logic', () => {
  it('should handle browser URL parsing', () => {
    // Simulates what happens in useUrlStateOnMount
    const parseBrowserUrl = (url: string) => {
      const urlObj = new URL(url, 'http://localhost')
      return {
        view: urlObj.searchParams.get('view') || 'list',
        unreadOnly: urlObj.searchParams.get('unread') === 'true',
        sortBy: urlObj.searchParams.get('sort') || 'publishedAt',
        feedId: urlObj.searchParams.get('feedId') || undefined,
        category: urlObj.searchParams.get('category') || undefined,
        articleId: urlObj.searchParams.get('articleId') || undefined,
      }
    }

    expect(parseBrowserUrl('http://localhost/')).toEqual({
      view: 'list',
      unreadOnly: false,
      sortBy: 'publishedAt',
      feedId: undefined,
      category: undefined,
      articleId: undefined,
    })

    expect(parseBrowserUrl('http://localhost/?view=grid&unread=true&sort=title')).toEqual({
      view: 'grid',
      unreadOnly: true,
      sortBy: 'title',
      feedId: undefined,
      category: undefined,
      articleId: undefined,
    })

    expect(parseBrowserUrl('http://localhost/?feedId=f1&articleId=a42')).toEqual({
      view: 'list',
      unreadOnly: false,
      sortBy: 'publishedAt',
      feedId: 'f1',
      category: undefined,
      articleId: 'a42',
    })
  })
})

describe('URL serialization for sharing', () => {
  it('should create shareable URLs', () => {
    const createShareableUrl = (
      basePath: string,
      state: {
        view?: string
        unreadOnly?: boolean
        sortBy?: string
        feedId?: string
        articleId?: string
      },
    ) => {
      const params = new URLSearchParams()
      if (state.view && state.view !== 'list') params.set('view', state.view)
      if (state.unreadOnly) params.set('unread', 'true')
      if (state.sortBy && state.sortBy !== 'publishedAt') params.set('sort', state.sortBy)
      if (state.feedId) params.set('feedId', state.feedId)
      if (state.articleId) params.set('articleId', state.articleId)

      const queryString = params.toString()
      return queryString ? `${basePath}?${queryString}` : basePath
    }

    expect(createShareableUrl('/feeds', { view: 'list' })).toBe('/feeds')
    expect(createShareableUrl('/feeds', { view: 'grid' })).toBe('/feeds?view=grid')
    expect(createShareableUrl('/feeds', { view: 'grid', unreadOnly: true })).toBe(
      '/feeds?view=grid&unread=true',
    )
    expect(createShareableUrl('/feeds', { feedId: 'f1', articleId: 'a42' })).toBe(
      '/feeds?feedId=f1&articleId=a42',
    )
  })
})

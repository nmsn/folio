import React, { useMemo } from 'react'
import { formatRelativeTime } from '../utils/format-relative-time'
import { groupArticlesByDay, type DayGroup } from '../utils/group-articles-by-day'

export interface ArticleItem {
  id: string
  sourceId?: string
  title: string
  author?: string | null
  publishedAt: string | number | Date
  description?: string | null
  content?: string | null
}

interface FolioArticleListProps {
  articles: ArticleItem[]
  loading: boolean
  error: boolean
  selectedFeedId: string | null
  selectedArticleId: string | null
  filter: 'all' | 'unread' | 'starred'
  isRead: (id: string) => boolean
  isStarred: (id: string) => boolean
  onFilter: (f: 'all' | 'unread' | 'starred') => void
  onSelect: (id: string) => void
  onToggleStar: (id: string) => void
  onRefresh: () => void
  refreshing: boolean
  feedNameMap: Record<string, string>
}

export function FolioArticleList({
  articles,
  loading,
  error,
  selectedFeedId,
  selectedArticleId,
  filter,
  isRead,
  isStarred,
  onFilter,
  onSelect,
  onToggleStar,
  onRefresh,
  refreshing,
  feedNameMap,
}: FolioArticleListProps) {
  const filtered = useMemo(
    () =>
      articles.filter((a) => {
        if (filter === 'unread' && isRead(a.id)) return false
        if (filter === 'starred' && !isStarred(a.id)) return false
        return true
      }),
    [articles, filter, isRead, isStarred],
  )

  const groups: DayGroup<ArticleItem>[] = useMemo(() => groupArticlesByDay(filtered), [filtered])

  const sourceCount = useMemo(
    () => new Set(filtered.map((a) => a.sourceId).filter(Boolean)).size,
    [filtered],
  )
  const unreadInFiltered = filtered.filter((a) => !isRead(a.id)).length
  const starredInFiltered = filtered.filter((a) => isStarred(a.id)).length

  return (
    <section className="col col-list">
      <div className="list-head">
        <h2>全部文章</h2>
        <div className="sub">
          {filtered.length} 篇 · 来自 {sourceCount} 个源
        </div>
      </div>
      <div className="list-tabs">
        {(['all', 'unread', 'starred'] as const).map((f) => (
          <button
            key={f}
            className={`list-tab ${filter === f ? 'active' : ''}`}
            onClick={() => onFilter(f)}
          >
            {f === 'all' ? '全部' : f === 'unread' ? '未读' : '已收藏'}
            <span className="num">
              {f === 'all'
                ? filtered.length
                : f === 'unread'
                  ? unreadInFiltered
                  : starredInFiltered}
            </span>
          </button>
        ))}
      </div>
      <div className="list-scroll">
        {!selectedFeedId ? (
          <p className="p-4 text-sm" style={{ color: 'var(--muted)' }}>
            请选择订阅源
          </p>
        ) : loading ? (
          <p className="p-4 text-sm" style={{ color: 'var(--muted)' }}>
            加载中…
          </p>
        ) : error ? (
          <p className="p-4 text-sm text-red-500">加载文章失败</p>
        ) : filtered.length === 0 ? (
          <div className="p-4 space-y-3">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              暂无文章
            </p>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 text-xs disabled:opacity-50"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                borderRadius: 'var(--r-sm)',
              }}
            >
              {refreshing ? '刷新中…' : '刷新订阅源'}
            </button>
          </div>
        ) : (
          <>
            {groups.map((g) => (
              <div key={g.label}>
                <div className="day-sep">{g.label}</div>
                {g.items.map((a) => {
                  const read = isRead(a.id)
                  const starred = isStarred(a.id)
                  const feedName = a.sourceId ? feedNameMap[a.sourceId] : undefined
                  return (
                    <article
                      key={a.id}
                      className={`item ${selectedArticleId === a.id ? 'is-active' : ''} ${read ? 'is-read' : 'is-unread'}`}
                      data-state={read ? 'read' : 'unread'}
                      onClick={() => onSelect(a.id)}
                    >
                      <span className="unread" />
                      <div className="item-body">
                        <div className="item-meta">
                          <span className="src">{feedName ?? 'RSS'}</span>
                          {a.author && (
                            <>
                              <span className="dot" />
                              <span>{a.author}</span>
                            </>
                          )}
                        </div>
                        <h3 className="item-title">{a.title}</h3>
                        {a.description && <p className="item-excerpt">{a.description}</p>}
                      </div>
                      <div className="item-aside">
                        <span className="item-time">{formatRelativeTime(a.publishedAt)}</span>
                        <button
                          className={`item-star ${starred ? 'is-on' : ''}`}
                          title={starred ? '已收藏' : '收藏'}
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleStar(a.id)
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill={starred ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  )
}

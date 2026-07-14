import React, { useState } from 'react'
import { formatRelativeTime } from '../utils/format-relative-time'
import { AiSummary } from './AiSummary'
import type { ArticleItem } from './FolioArticleList'

interface FolioReaderProps {
  article: ArticleItem | null | undefined
  loading: boolean
  error: boolean
  feedName: string | null | undefined
  isRead: boolean
  isStarred: boolean
  onToggleStar: () => void
  onMarkRead: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  nextTitle?: string
  nextFeedName?: string
}

export function FolioReader({
  article,
  loading,
  error,
  feedName,
  isRead,
  isStarred,
  onToggleStar,
  onMarkRead,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  nextTitle,
  nextFeedName,
}: FolioReaderProps) {
  const [aiOpen, setAiOpen] = useState(false)

  if (!article) {
    return (
      <section className="col col-content">
        <p className="p-6 text-sm" style={{ color: 'var(--muted)' }}>
          请选择文章
        </p>
      </section>
    )
  }
  if (loading) {
    return (
      <section className="col col-content">
        <p className="p-6 text-sm" style={{ color: 'var(--muted)' }}>
          加载中…
        </p>
      </section>
    )
  }
  if (error) {
    return (
      <section className="col col-content">
        <p className="p-6 text-sm text-red-500">加载文章失败</p>
      </section>
    )
  }

  const html = (article.description as string | null | undefined) ?? ''
  const date = new Date(article.published_at as string | number | Date)
  const dateStr = `${date.getFullYear()} / ${String(date.getMonth() + 1).padStart(2, '0')} / ${String(date.getDate()).padStart(2, '0')}`

  return (
    <section className="col col-content">
      {/* Toolbar */}
      <div className="article-toolbar">
        <button className="tool-btn" title="上一篇" disabled={!hasPrev} onClick={onPrev}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button className="tool-btn" title="下一篇" disabled={!hasNext} onClick={onNext}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 6px' }} />
        <button
          className={`tool-btn ${isStarred ? 'is-on' : ''}`}
          onClick={onToggleStar}
          title={isStarred ? '已收藏' : '收藏'}
        >
          <svg
            viewBox="0 0 24 24"
            fill={isStarred ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.1z 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {isStarred ? '已收藏' : '收藏'}
        </button>
        <button
          className={`tool-btn ${isRead ? 'is-on' : ''}`}
          onClick={onMarkRead}
          title="标记已读"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {isRead ? '已读' : '标记已读'}
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 6px' }} />
        <button
          className={`tool-btn is-ai ${aiOpen ? 'is-on' : ''}`}
          onClick={() => setAiOpen((v) => !v)}
          title="AI 总结 (⌘ + .)"
        >
          <svg
            className="ai-spark"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          AI 总结
          <span className="kbd">⌘.</span>
        </button>
        <div style={{ flex: 1 }} />
        <button
          className="tool-btn"
          title="稍后读"
          onClick={() => {
            /* no-op */
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          稍后读
        </button>
        <button
          className="tool-btn"
          title="分享"
          onClick={() =>
            navigator.clipboard?.writeText((article as unknown as { url?: string }).url ?? '')
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          分享
        </button>
        <button className="tool-btn" title="更多">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>

      {/* Article scroll */}
      <div className="article-scroll">
        <article className="article">
          <div className="article-kicker">
            <span className="src">{feedName ?? ''}</span>
            <span className="sep">·</span>
            <span>文章</span>
            <span className="sep">·</span>
            <span>{dateStr}</span>
          </div>
          <h1 className="title">{article.title}</h1>

          <div className="byline">
            <div className="avatar">{initials(article.author)}</div>
            <span className="author">{article.author ?? 'Unknown'}</span>
            <span>·</span>
            <span>{formatRelativeTime(article.published_at)}</span>
          </div>

          <AiSummary
            article={{
              id: article.id,
              title: article.title,
              description: article.description,
              url: (article as unknown as { url?: string }).url,
            }}
            open={aiOpen}
            onToggle={() => setAiOpen((v) => !v)}
          />

          <div className="body" dangerouslySetInnerHTML={{ __html: html }} />

          <div className="article-foot">
            <div className="progress">
              <span>阅读进度</span>
              <span className="bar">
                <i style={{ width: '28%' }} />
              </span>
              <span style={{ color: 'var(--fg-2)' }}>28%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span>全文约 {Math.max(100, html.length)} 字</span>
              <span style={{ color: 'var(--border-2)' }}>·</span>
              <span>来自 {feedName ?? 'RSS'}</span>
            </div>
          </div>

          {nextTitle && (
            <div className="next-up">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="label">下一篇 · 来自 {nextFeedName ?? 'RSS'}</div>
                <div className="next-title">{nextTitle}</div>
              </div>
              <button className="arrow" onClick={onNext} title="下一篇">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

function initials(author?: string | null): string {
  if (!author) return '?'
  const parts = author.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return author.slice(0, 2).toUpperCase()
}

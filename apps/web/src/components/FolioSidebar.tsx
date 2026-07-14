import React, { useState } from 'react'
import type { Feed, SmartView, FeedGroup } from '../hooks/useGroupedFeeds'

interface FolioSidebarProps {
  feeds: Feed[]
  grouped: { smartViews: SmartView[]; groups: FeedGroup[] }
  selectedSmartView: string
  selectedFeedId: string | null
  onSelectSmartView: (id: string) => void
  onSelectFeed: (id: string | null) => void
  onAddFeed: () => void
}

const ICONS: Record<string, React.ReactNode> = {
  all: <path d="M3 6h18M3 12h18M3 18h12" />,
  today: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  unread: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </>
  ),
  starred: (
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  ),
  later: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
}

function NavItem({
  active,
  hasUnread,
  label,
  count,
  onClick,
  icon,
}: {
  active?: boolean
  hasUnread?: boolean
  label: string
  count?: number
  onClick?: () => void
  icon?: React.ReactNode
}) {
  return (
    <button
      className={`nav-item ${active ? 'active' : ''} ${hasUnread && count ? 'has-unread' : ''}`}
      onClick={onClick}
    >
      {icon !== undefined && (
        <svg
          className="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {icon}
        </svg>
      )}
      <span className="label">{label}</span>
      {count !== undefined && <span className="count">{count}</span>}
    </button>
  )
}

export function FolioSidebar({
  feeds: _feeds,
  grouped,
  selectedSmartView,
  selectedFeedId,
  onSelectSmartView,
  onSelectFeed,
  onAddFeed,
}: FolioSidebarProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  return (
    <aside className="col col-nav">
      {/* Topbar */}
      <div className="topbar">
        <div className="brand">
          Folio
          <span className="dot" />
        </div>
        <div className="spacer" />
        <div className="actions">
          <button className="icon-btn" title="同步">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 0 1-15.5 6.36L3 16" />
              <path d="M3 12a9 9 0 0 1 15.5-6.36L21 8" />
              <path d="M21 3v5h-5M3 21v-5h5" />
            </svg>
          </button>
          <button className="icon-btn" title="设置">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 4.27 16.9l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 7.04 4.27l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="nav-search">
        <label className="field">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="text" placeholder="搜索订阅源或文章" />
          <span className="kbd">⌘K</span>
        </label>
      </div>

      {/* Nav scroll */}
      <nav className="nav-scroll">
        {/* Smart views */}
        <div className="nav-section">
          {grouped.smartViews.map((sv) => (
            <NavItem
              key={sv.id}
              active={selectedSmartView === sv.id}
              hasUnread={sv.count > 0}
              label={sv.label}
              count={sv.count}
              icon={ICONS[sv.id]}
              onClick={() => onSelectSmartView(sv.id)}
            />
          ))}
        </div>

        {/* Feed groups */}
        {grouped.groups.map((g) => {
          const isCollapsed = collapsed.has(g.category)
          return (
            <div
              key={g.category}
              className={`nav-section nav-group ${isCollapsed ? 'collapsed' : ''}`}
            >
              <h6>
                <button
                  className="nav-group-toggle"
                  onClick={() =>
                    setCollapsed((s) => {
                      const n = new Set(s)
                      n.has(g.category) ? n.delete(g.category) : n.add(g.category)
                      return n
                    })
                  }
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {g.category}
                  <svg
                    className="chev"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <span style={{ fontWeight: 400 }}>{g.feeds.length}</span>
              </h6>
              <div className="nav-children">
                {g.feeds.map((f) => (
                  <NavItem
                    key={f.id}
                    active={selectedFeedId === f.id}
                    label={f.name}
                    onClick={() => {
                      onSelectSmartView('all')
                      onSelectFeed(f.id)
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Footer */}
        <div className="nav-footer">
          <button className="nav-item" style={{ color: 'var(--muted)' }} onClick={onAddFeed}>
            <svg
              className="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="label">添加订阅源</span>
          </button>
        </div>
      </nav>
    </aside>
  )
}

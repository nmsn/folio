import React, { useMemo, useState } from 'react'
import { FolioThreeColumnLayout } from './components/FolioThreeColumnLayout'
import { useFeeds, useCreateFeed, useRefreshFeed } from './hooks/useFeeds'
import { useArticles, useArticle } from './hooks/useArticles'
import { useArticleState } from './hooks/useArticleState'
import { useGroupedFeeds, type Feed } from './hooks/useGroupedFeeds'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { FolioSidebar } from './components/FolioSidebar'
import { FolioArticleList, type ArticleItem } from './components/FolioArticleList'
import { FolioReader } from './components/FolioReader'

const MOCK_USER = { id: '1', email: 'test@test.com', name: 'Test User' }

function App() {
  const user = MOCK_USER

  // data
  const {
    data: feedsRaw = [],
    isLoading: feedsLoading,
    isError: feedsError,
    refetch: refetchFeeds,
  } = useFeeds()
  const feeds = feedsRaw as unknown as Feed[]
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null)
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [selectedSmartView, setSelectedSmartView] = useState('all')
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all')
  const [showAddFeed, setShowAddFeed] = useState(false)

  const {
    data: articles = [],
    isLoading: articlesLoading,
    isError: articlesError,
    refetch: refetchArticles,
  } = useArticles(selectedFeedId ?? undefined)
  const articleList = articles as unknown as ArticleItem[]

  const {
    data: selectedArticleRaw,
    isLoading: articleLoading,
    isError: articleError,
  } = useArticle(selectedArticleId ?? '')
  const selectedArticle = selectedArticleRaw as unknown as ArticleItem | null | undefined

  // refresh
  const refreshFeed = useRefreshFeed()
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const handleRefreshFeed = async () => {
    if (!selectedFeedId) return
    setRefreshing(true)
    setRefreshError(null)
    try {
      await refreshFeed.mutateAsync(selectedFeedId)
      refetchArticles()
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : '刷新失败')
    } finally {
      setRefreshing(false)
    }
  }

  // state (read/starred, localStorage)
  const { isRead, isStarred, markRead, toggleStarred } = useArticleState()

  // derived
  const unreadCount = useMemo(
    () => articleList.filter((a) => !isRead(a.id)).length,
    [articleList, isRead],
  )
  const starredCount = useMemo(
    () => articleList.filter((a) => isStarred(a.id)).length,
    [articleList, isStarred],
  )
  const grouped = useGroupedFeeds(feeds, { unread: unreadCount, starred: starredCount, later: 0 })

  const feedNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const f of feeds) m[f.id] = f.name
    return m
  }, [feeds])
  const currentFeedName = selectedFeedId ? feedNameMap[selectedFeedId] : undefined

  const sortedArticles = useMemo(
    () =>
      [...articleList].sort((a, b) => {
        const ta = new Date(a.published_at as string | number | Date).getTime()
        const tb = new Date(b.published_at as string | number | Date).getTime()
        return tb - ta
      }),
    [articleList],
  )

  // selection handlers
  const onSelectArticle = (id: string) => {
    setSelectedArticleId(id)
    if (!isRead(id)) markRead(id)
  }
  const onToggleStar = (id: string) => toggleStarred(id)
  const sortedIdx = useMemo(
    () => sortedArticles.findIndex((a) => a.id === selectedArticleId),
    [sortedArticles, selectedArticleId],
  )
  const onPrev = () => {
    if (sortedIdx > 0) onSelectArticle(sortedArticles[sortedIdx - 1].id)
  }
  const onNext = () => {
    if (sortedIdx >= 0 && sortedIdx < sortedArticles.length - 1)
      onSelectArticle(sortedArticles[sortedIdx + 1].id)
  }

  // keyboard
  useKeyboardShortcuts({
    onNext,
    onPrev,
    onToggleStar: () => selectedArticleId && onToggleStar(selectedArticleId),
    onMarkRead: () =>
      selectedArticleId && !isRead(selectedArticleId) && markRead(selectedArticleId),
    onToggleAI: () => {
      const aiBtn = document.querySelector('.tool-btn.is-ai') as HTMLButtonElement | null
      aiBtn?.click()
    },
  })

  return (
    <>
      <FolioThreeColumnLayout>
        <FolioSidebar
          feeds={feeds}
          grouped={grouped}
          selectedSmartView={selectedSmartView}
          selectedFeedId={selectedFeedId}
          onSelectSmartView={setSelectedSmartView}
          onSelectFeed={(id) => {
            setSelectedFeedId(id)
            setSelectedArticleId(null)
          }}
          onAddFeed={() => setShowAddFeed(true)}
        />
        <FolioArticleList
          articles={sortedArticles}
          loading={articlesLoading}
          error={articlesError}
          selectedFeedId={selectedFeedId}
          selectedArticleId={selectedArticleId}
          filter={filter}
          isRead={isRead}
          isStarred={isStarred}
          onFilter={setFilter}
          onSelect={onSelectArticle}
          onToggleStar={onToggleStar}
          onRefresh={handleRefreshFeed}
          refreshing={refreshing}
          feedNameMap={feedNameMap}
        />
        <FolioReader
          article={selectedArticle}
          loading={articleLoading}
          error={articleError}
          feedName={currentFeedName}
          isRead={selectedArticle ? isRead(selectedArticle.id) : false}
          isStarred={selectedArticle ? isStarred(selectedArticle.id) : false}
          onToggleStar={() => selectedArticle && onToggleStar(selectedArticle.id)}
          onMarkRead={() =>
            selectedArticle && !isRead(selectedArticle.id) && markRead(selectedArticle.id)
          }
          onPrev={onPrev}
          onNext={onNext}
          hasPrev={sortedIdx > 0}
          hasNext={sortedIdx >= 0 && sortedIdx < sortedArticles.length - 1}
          nextTitle={
            sortedIdx >= 0 && sortedIdx < sortedArticles.length - 1
              ? sortedArticles[sortedIdx + 1]?.title
              : undefined
          }
          nextFeedName={
            sortedIdx >= 0 && sortedIdx < sortedArticles.length - 1
              ? feedNameMap[(sortedArticles[sortedIdx + 1] as ArticleItem)?.source_id ?? '']
              : undefined
          }
        />
      </FolioThreeColumnLayout>
      <div className="keyhint" aria-hidden="true">
        <span className="group">
          <kbd>j</kbd>
          <kbd>k</kbd> 上下篇
        </span>
        <span className="group">
          <kbd>s</kbd> 收藏
        </span>
        <span className="group">
          <kbd>m</kbd> 标记已读
        </span>
        <span className="group">
          <kbd>⌘</kbd>
          <kbd>.</kbd> AI 总结
        </span>
        <span className="group">
          <kbd>⌘</kbd>
          <kbd>K</kbd> 搜索
        </span>
      </div>
    </>
  )
}

export default App

import { useMemo } from 'react'

export interface Feed {
  id: string
  name: string
  url: string
  category?: string | null
}

export interface SmartView {
  id: 'all' | 'today' | 'unread' | 'starred' | 'later'
  label: string
  count: number
}

export interface FeedGroup {
  category: string
  feeds: Feed[]
}

/**
 * 将 feeds 列表按 category 字段 group by，并提供 smart views 的基础计数。
 * smart views 计数仅基于 feeds 元数据（articles 计数由 caller 传入以计算 unread/starred）。
 */
export function useGroupedFeeds(
  feeds: Feed[],
  counts?: { unread: number; starred: number; later: number },
) {
  return useMemo(() => {
    const groups: FeedGroup[] = []
    const groupMap = new Map<string, Feed[]>()
    for (const f of feeds) {
      const cat = (f.category ?? '未分类').trim() || '未分类'
      if (!groupMap.has(cat)) {
        groupMap.set(cat, [])
        groups.push({ category: cat, feeds: groupMap.get(cat)! })
      }
      groupMap.get(cat)!.push(f)
    }
    // 字母排序（中文按 locale-aware 排序）
    groups.sort((a, b) => a.category.localeCompare(b.category, 'zh'))

    const smartViews: SmartView[] = [
      { id: 'all', label: '全部文章', count: feeds.length },
      { id: 'today', label: '今天', count: 0 },
      { id: 'unread', label: '未读', count: counts?.unread ?? 0 },
      { id: 'starred', label: '已收藏', count: counts?.starred ?? 0 },
      { id: 'later', label: '稍后读', count: counts?.later ?? 0 },
    ]

    return { smartViews, groups }
  }, [feeds, counts?.unread, counts?.starred, counts?.later])
}

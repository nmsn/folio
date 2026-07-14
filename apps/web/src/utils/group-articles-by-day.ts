export interface DayGroup<T> {
  label: string
  items: T[]
}

/**
 * 将文章列表按 published_at 字段分组成 day bucket。
 * 排序：按 published_at 降序。
 * 分组 key：今天 / 昨天 / 早 X 天 / 本周更早 / 更早。
 * 适用于已经按时间倒序排列的列表。
 */
export function groupArticlesByDay<T extends { published_at: string | number | Date }>(
  articles: T[],
): DayGroup<T>[] {
  if (articles.length === 0) return []

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400_000
  const weekStart = todayStart - 7 * 86400_000

  const groups: Record<string, T[]> = {}
  const order: string[] = []

  for (const a of articles) {
    const date = a.published_at instanceof Date ? a.published_at : new Date(a.published_at)
    const t = date.getTime()
    if (Number.isNaN(t)) continue

    let key: string
    if (t >= todayStart) key = '今天'
    else if (t >= yesterdayStart) key = '昨天'
    else if (t >= weekStart) {
      const days = Math.floor((todayStart - t) / 86400_000)
      key = `${days} 天前`
    } else if (t >= weekStart - 30 * 86400_000) {
      key = '本月更早'
    } else {
      key = '更早'
    }

    if (!groups[key]) {
      groups[key] = []
      order.push(key)
    }
    groups[key].push(a)
  }

  return order.map((label) => ({ label, items: groups[label] }))
}

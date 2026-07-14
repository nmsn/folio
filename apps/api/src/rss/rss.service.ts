import { Injectable } from '@nestjs/common'
import { fetchFeed, FetchFeedOptions } from './fetch-feed'
import { parseFeed, ParsedFeed } from './parse-feed'
import { FeedsRepository } from '../feeds/feeds.repository'

@Injectable()
export class RssService {
  constructor(private feeds: FeedsRepository) {}

  async fetchAndParseFeed(feedId: string): Promise<ParsedFeed & { newArticles?: unknown[] }> {
    const feed = await this.feeds.findById(feedId)
    if (!feed) throw new Error('Feed not found')

    const options: FetchFeedOptions = {}
    // raw pg query 返回 integer (number)，不是 Date — 需先乘 1000 转毫秒
    const lastFetchedAt = (feed as { last_fetched_at?: number | Date | null }).last_fetched_at
    if (lastFetchedAt) {
      const ms = typeof lastFetchedAt === 'number' ? lastFetchedAt * 1000 : lastFetchedAt.getTime()
      options.lastModified = new Date(ms).toUTCString()
    }

    const result = await fetchFeed((feed as { url: string }).url, options)
    if (!result.content) return { title: '', feedUrl: '', articles: [] }

    const parsed = await parseFeed(result.content, (feed as { url: string }).url)

    await this.feeds.updateLastFetched(feedId, new Date())

    return { ...parsed, newArticles: [] }
  }
}

import { boss } from './feed-scheduler'
import { RssService } from '../rss/rss.service'
import { ArticlesService } from '../articles/articles.service'

export function registerFeedProcessors(rssService: RssService, articlesService: ArticlesService) {
  // Process individual feed fetch jobs
  // pg-boss v8: handler 收 Job 对象 (id, name, data)，不是裸 data
  boss.work('feed.fetch', { concurrency: 3 }, async (job: { data: { feedId: string } }) => {
    const { feedId } = job.data
    console.log(`Processing feed: ${feedId}`)
    try {
      const result = await articlesService.refreshFeed(feedId)
      console.log(`Fetched ${result.newArticles?.length || 0} new articles from feed ${feedId}`)
      return result
    } catch (error) {
      console.error(`Failed to fetch feed ${feedId}:`, error)
      throw error
    }
  })

  // Process scheduled refresh check
  boss.work('feed-refresh-scheduler', { concurrency: 1 }, async () => {
    console.log('Running feed refresh scheduler...')
    // TODO: query for feeds that need refresh based on their refresh interval
    // and enqueue feed.fetch jobs for each one
  })
}

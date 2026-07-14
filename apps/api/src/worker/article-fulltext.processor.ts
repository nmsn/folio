import { boss } from './feed-scheduler'
import { ArticlesRepository } from '../articles/articles.repository'
import { extractFulltext } from '../rss/extract-fulltext'

export function registerArticleProcessors(articlesRepo: ArticlesRepository) {
  // pg-boss v8: handler 收 Job 对象 (id, name, data)，不是裸 data
  boss.work(
    'article.fulltext-fetch',
    { concurrency: 4 },
    async (job: { data: { articleId: string; url: string } }) => {
      const { articleId, url } = job.data
      console.log(`Fetching fulltext for article: ${articleId}`)
      try {
        const result = await extractFulltext(url)
        await articlesRepo.updateContent(articleId, result.content)
        console.log(`Fulltext fetched for article: ${articleId}`)
        return result
      } catch (error) {
        console.error(`Failed to fetch fulltext for ${articleId}:`, error)
        throw error
      }
    },
  )
}

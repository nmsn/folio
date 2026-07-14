import { boss } from './feed-scheduler'
import { ArticlesRepository } from '../articles/articles.repository'
import { ReadingRepository } from '../reading/reading.repository'
import { AnnotationsRepository } from '../annotations/annotations.repository'
import { ClaudeClient } from '../ai/clients/claude.client'

export function registerAiProcessors(
  articlesRepo: ArticlesRepository,
  readingRepo: ReadingRepository,
  annotationsRepo: AnnotationsRepository,
) {
  const claudeClient = new ClaudeClient()

  // pg-boss v8: handler 收 Job 对象 (id, name, data)，不是裸 data
  boss.work(
    'ai.summarize',
    { concurrency: 2 },
    async (job: { data: { articleId: string; userId: string } }) => {
      const { articleId, userId } = job.data
      console.log(`AI summarizing article: ${articleId}`)

      const article = await articlesRepo.findById(articleId)
      if (!article) {
        console.error(`Article not found: ${articleId}`)
        return
      }

      const content =
        (article as { content?: string }).content ||
        (article as { description?: string }).description ||
        ''

      if (!content) {
        console.error(`No content to summarize for article: ${articleId}`)
        return
      }

      try {
        const result = await claudeClient.summarize(content)

        const readingItem = await readingRepo.findByUserAndArticle(userId, articleId)
        if (readingItem) {
          await readingRepo.update(readingItem.id, { status: 'reading' })
        }

        if (readingItem) {
          const id = crypto.randomUUID()
          await annotationsRepo.create({
            id,
            readingItemId: readingItem.id,
            type: 'summary',
            content: result.summary,
          })
        }

        console.log(`AI summary complete for article: ${articleId}`)
        return result
      } catch (error) {
        console.error(`AI summarize failed for ${articleId}:`, error)
        throw error
      }
    },
  )
}

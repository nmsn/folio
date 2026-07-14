import { boss } from './feed-scheduler'
import { ArticlesRepository } from '../articles/articles.repository'
import { ReadingRepository } from '../reading/reading.repository'
import { AnnotationsRepository } from '../annotations/annotations.repository'
import { ClaudeClient } from '../ai/clients/claude.client'

export function registerAiAnswerProcessor(
  articlesRepo: ArticlesRepository,
  readingRepo: ReadingRepository,
  annotationsRepo: AnnotationsRepository,
) {
  const claudeClient = new ClaudeClient()

  // pg-boss v8: handler 收 Job 对象 (id, name, data)，不是裸 data
  boss.work(
    'ai.answer',
    { concurrency: 2 },
    async (job: { data: { articleId: string; userId: string; question: string } }) => {
      const { articleId, userId, question } = job.data
      console.log(`AI answering question for article: ${articleId}`)

      const article = await articlesRepo.findById(articleId)
      if (!article) {
        console.error(`Article not found: ${articleId}`)
        return
      }

      const content =
        (article as { content?: string }).content ||
        (article as { description?: string }).description ||
        ''

      try {
        const result = await claudeClient.answer(content, question)

        const readingItem = await readingRepo.findByUserAndArticle(userId, articleId)
        if (readingItem) {
          const id = crypto.randomUUID()
          await annotationsRepo.create({
            id,
            readingItemId: readingItem.id,
            type: 'answer',
            content: `Q: ${question}\n\nA: ${result.answer}`,
          })
        }

        return result
      } catch (error) {
        console.error(`AI answer failed for ${articleId}:`, error)
        throw error
      }
    },
  )
}

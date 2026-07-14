import { boss } from './feed-scheduler'
import { ArticlesRepository } from '../articles/articles.repository'
import { ClaudeClient } from '../ai/clients/claude.client'

export function registerAiFilterProcessor(articlesRepo: ArticlesRepository) {
  const claudeClient = new ClaudeClient()

  // pg-boss v8: handler 收 Job 对象 (id, name, data)，不是裸 data
  boss.work(
    'ai.filter',
    { concurrency: 3 },
    async (job: { data: { articleId: string; userPreferences?: string } }) => {
      const { articleId, userPreferences } = job.data
      console.log(`AI filtering article: ${articleId}`)

      const article = await articlesRepo.findById(articleId)
      if (!article) {
        console.error(`Article not found: ${articleId}`)
        return
      }

      const content = (article as { description?: string }).description || ''

      try {
        const result = await claudeClient.filter(content, userPreferences)
        console.log(`AI filter complete for article: ${articleId}, relevant: ${result.relevant}`)
        return result
      } catch (error) {
        console.error(`AI filter failed for ${articleId}:`, error)
        throw error
      }
    },
  )
}

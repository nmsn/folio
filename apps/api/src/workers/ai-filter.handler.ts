import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { articles } from '@folio/db'
import { ClaudeClient } from '@folio/api'
import type { CloudflareEnv } from '@folio/api/env'

export type AiFilterMessage = {
  type: 'ai.filter'
  articleId: string
  userPreferences?: string
}

export async function handleAiFilter(env: CloudflareEnv, message: AiFilterMessage) {
  const { articleId, userPreferences } = message
  console.log(`AI filtering article: ${articleId}`)

  if (!env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY missing')
    return
  }

  const db = drizzle(env.DB)
  const article = await db.select().from(articles).where(eq(articles.id, articleId)).get()
  if (!article) {
    console.error(`Article not found: ${articleId}`)
    return
  }

  const content = article.description || article.content || ''
  const result = await new ClaudeClient(env.ANTHROPIC_API_KEY).filter(content, userPreferences)
  console.log(`AI filter complete for article: ${articleId}, relevant: ${result.relevant}`)
  return result
}

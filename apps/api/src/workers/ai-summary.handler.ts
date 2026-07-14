import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { articles, readingItems, aiAnnotations } from '@folio/db'
import { ClaudeClient } from '@folio/api'
import type { CloudflareEnv } from '@folio/api/env'

export type AiSummaryMessage = {
  type: 'ai.summarize'
  articleId: string
  userId: string
}

export async function handleAiSummary(env: CloudflareEnv, message: AiSummaryMessage) {
  const { articleId, userId } = message
  console.log(`AI summarizing article: ${articleId}`)

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

  const content = article.content || article.description || ''
  if (!content) {
    console.error(`No content to summarize for article: ${articleId}`)
    return
  }

  const result = await new ClaudeClient(env.ANTHROPIC_API_KEY).summarize(content)

  const readingItem = await db
    .select()
    .from(readingItems)
    .where(and(eq(readingItems.userId, userId), eq(readingItems.articleId, articleId)))
    .get()

  if (readingItem) {
    await db.insert(aiAnnotations).values({
      id: crypto.randomUUID(),
      readingItemId: readingItem.id,
      type: 'summary',
      content: result.summary,
      createdAt: new Date(),
    })
    await db
      .update(readingItems)
      .set({ aiSummary: result.summary, status: 'reading', updatedAt: new Date() })
      .where(eq(readingItems.id, readingItem.id))
  }

  console.log(`AI summary complete for article: ${articleId}`)
  return result
}

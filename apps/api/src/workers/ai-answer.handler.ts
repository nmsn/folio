import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { articles, readingItems, aiAnnotations } from '@folio/db'
import { ClaudeClient } from '@folio/api'
import type { CloudflareEnv } from '@folio/api/env'

export type AiAnswerMessage = {
  type: 'ai.answer'
  articleId: string
  userId: string
  question: string
}

export async function handleAiAnswer(env: CloudflareEnv, message: AiAnswerMessage) {
  const { articleId, userId, question } = message
  console.log(`AI answering question for article: ${articleId}`)

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
  const result = await new ClaudeClient(env.ANTHROPIC_API_KEY).answer(content, question)

  const readingItem = await db
    .select()
    .from(readingItems)
    .where(and(eq(readingItems.userId, userId), eq(readingItems.articleId, articleId)))
    .get()

  if (readingItem) {
    await db.insert(aiAnnotations).values({
      id: crypto.randomUUID(),
      readingItemId: readingItem.id,
      type: 'answer',
      content: `Q: ${question}\n\nA: ${result.answer}`,
      createdAt: new Date(),
    })
  }

  return result
}

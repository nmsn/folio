import { ORPCError, os } from '@orpc/server'
import { eq, and } from 'drizzle-orm'
import { articles, readingItems, aiAnnotations } from '@folio/db'
import { z } from 'zod'
import type { Context } from './context'
import { SummarizeSchema, AnswerSchema, FilterSchema } from './lib/schemas'
import { ClaudeClient } from './lib/claude'

const o = os.$context<Context>()

function requireUser(context: Context) {
  if (!context.user) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Not authenticated' })
  }
  return context.user
}

function getClaude(context: Context) {
  const key = context.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new ORPCError('PRECONDITION_FAILED', { message: 'ANTHROPIC_API_KEY not configured' })
  }
  return new ClaudeClient(key)
}

export const aiApi = {
  summarize: o.input(SummarizeSchema).handler(async ({ context, input }) => {
    const user = requireUser(context)
    const article = await context.db
      .select()
      .from(articles)
      .where(eq(articles.id, input.articleId))
      .get()
    if (!article) throw new ORPCError('NOT_FOUND', { message: 'Article not found' })

    const readingItem = await context.db
      .select()
      .from(readingItems)
      .where(and(eq(readingItems.userId, user.id), eq(readingItems.articleId, input.articleId)))
      .get()
    if (!readingItem) {
      throw new ORPCError('NOT_FOUND', { message: 'Article not in reading list' })
    }

    if (context.env.AI_QUEUE) {
      await context.env.AI_QUEUE.send({
        type: 'ai.summarize',
        articleId: input.articleId,
        userId: user.id,
      })
      return { queued: true as const, jobId: crypto.randomUUID() }
    }

    // Sync fallback when queue not bound
    const content = article.content || article.description || ''
    const result = await getClaude(context).summarize(content)
    await context.db.insert(aiAnnotations).values({
      id: crypto.randomUUID(),
      readingItemId: readingItem.id,
      type: 'summary',
      content: result.summary,
      createdAt: new Date(),
    })
    await context.db
      .update(readingItems)
      .set({ aiSummary: result.summary, updatedAt: new Date() })
      .where(eq(readingItems.id, readingItem.id))

    return { queued: false as const, result }
  }),

  answer: o.input(AnswerSchema).handler(async ({ context, input }) => {
    const user = requireUser(context)
    const article = await context.db
      .select()
      .from(articles)
      .where(eq(articles.id, input.articleId))
      .get()
    if (!article) throw new ORPCError('NOT_FOUND', { message: 'Article not found' })

    const content = article.content || article.description || ''
    const result = await getClaude(context).answer(content, input.question)

    const readingItem = await context.db
      .select()
      .from(readingItems)
      .where(and(eq(readingItems.userId, user.id), eq(readingItems.articleId, input.articleId)))
      .get()

    if (readingItem) {
      await context.db.insert(aiAnnotations).values({
        id: crypto.randomUUID(),
        readingItemId: readingItem.id,
        type: 'answer',
        content: `Q: ${input.question}\n\nA: ${result.answer}`,
        createdAt: new Date(),
      })
    }

    return result
  }),

  filter: o.input(FilterSchema).handler(async ({ context, input }) => {
    const article = await context.db
      .select()
      .from(articles)
      .where(eq(articles.id, input.articleId))
      .get()
    if (!article) throw new ORPCError('NOT_FOUND', { message: 'Article not found' })

    const content = article.description || article.content || ''
    return getClaude(context).filter(content, input.userPreferences)
  }),
}

import { ORPCError, os } from '@orpc/server'
import { eq, and, desc } from 'drizzle-orm'
import { readingItems, articles } from '@folio/db'
import { z } from 'zod'
import type { Context } from './context'
import { CreateReadingItemSchema, UpdateReadingItemSchema } from './lib/schemas'

const o = os.$context<Context>()

function requireUser(context: Context) {
  if (!context.user) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Not authenticated' })
  }
  return context.user
}

const ListInput = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

const StatusInput = ListInput.extend({
  status: z.enum(['unread', 'reading', 'read', 'saved']),
})

export const readingApi = {
  list: o.input(ListInput).handler(async ({ context, input }) => {
    const user = requireUser(context)
    return context.db
      .select({
        id: readingItems.id,
        userId: readingItems.userId,
        articleId: readingItems.articleId,
        status: readingItems.status,
        progress: readingItems.progress,
        aiSummary: readingItems.aiSummary,
        createdAt: readingItems.createdAt,
        updatedAt: readingItems.updatedAt,
        title: articles.title,
        url: articles.url,
        description: articles.description,
        imageUrl: articles.imageUrl,
        publishedAt: articles.publishedAt,
      })
      .from(readingItems)
      .innerJoin(articles, eq(articles.id, readingItems.articleId))
      .where(eq(readingItems.userId, user.id))
      .orderBy(desc(readingItems.createdAt))
      .limit(input.limit)
      .offset(input.offset)
      .all()
  }),

  byStatus: o.input(StatusInput).handler(async ({ context, input }) => {
    const user = requireUser(context)
    return context.db
      .select({
        id: readingItems.id,
        userId: readingItems.userId,
        articleId: readingItems.articleId,
        status: readingItems.status,
        progress: readingItems.progress,
        aiSummary: readingItems.aiSummary,
        createdAt: readingItems.createdAt,
        updatedAt: readingItems.updatedAt,
        title: articles.title,
        url: articles.url,
        description: articles.description,
        imageUrl: articles.imageUrl,
        publishedAt: articles.publishedAt,
      })
      .from(readingItems)
      .innerJoin(articles, eq(articles.id, readingItems.articleId))
      .where(and(eq(readingItems.userId, user.id), eq(readingItems.status, input.status)))
      .orderBy(desc(readingItems.createdAt))
      .limit(input.limit)
      .offset(input.offset)
      .all()
  }),

  get: o.input(z.object({ id: z.string() })).handler(async ({ context, input }) => {
    const user = requireUser(context)
    const item = await context.db
      .select()
      .from(readingItems)
      .where(eq(readingItems.id, input.id))
      .get()
    if (!item) throw new ORPCError('NOT_FOUND', { message: 'Reading item not found' })
    if (item.userId !== user.id) throw new ORPCError('FORBIDDEN', { message: 'Forbidden' })
    return item
  }),

  create: o.input(CreateReadingItemSchema).handler(async ({ context, input }) => {
    const user = requireUser(context)
    const article = await context.db
      .select()
      .from(articles)
      .where(eq(articles.id, input.articleId))
      .get()
    if (!article) throw new ORPCError('NOT_FOUND', { message: 'Article not found' })

    const existing = await context.db
      .select()
      .from(readingItems)
      .where(and(eq(readingItems.userId, user.id), eq(readingItems.articleId, input.articleId)))
      .get()
    if (existing) {
      throw new ORPCError('CONFLICT', { message: 'Article already in reading list' })
    }

    const id = crypto.randomUUID()
    const now = new Date()
    const [item] = await context.db
      .insert(readingItems)
      .values({
        id,
        userId: user.id,
        articleId: input.articleId,
        status: 'unread',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    return item
  }),

  update: o
    .input(z.object({ id: z.string() }).merge(UpdateReadingItemSchema))
    .handler(async ({ context, input }) => {
      const user = requireUser(context)
      const existing = await context.db
        .select()
        .from(readingItems)
        .where(eq(readingItems.id, input.id))
        .get()
      if (!existing) throw new ORPCError('NOT_FOUND', { message: 'Reading item not found' })
      if (existing.userId !== user.id) throw new ORPCError('FORBIDDEN', { message: 'Forbidden' })

      const patch: { status?: typeof existing.status; progress?: number; updatedAt: Date } = {
        updatedAt: new Date(),
      }
      if (input.status !== undefined) patch.status = input.status
      if (input.progress !== undefined) patch.progress = Math.floor(input.progress * 100)

      const [updated] = await context.db
        .update(readingItems)
        .set(patch)
        .where(eq(readingItems.id, input.id))
        .returning()
      return updated
    }),

  delete: o.input(z.object({ id: z.string() })).handler(async ({ context, input }) => {
    const user = requireUser(context)
    const existing = await context.db
      .select()
      .from(readingItems)
      .where(eq(readingItems.id, input.id))
      .get()
    if (!existing) throw new ORPCError('NOT_FOUND', { message: 'Reading item not found' })
    if (existing.userId !== user.id) throw new ORPCError('FORBIDDEN', { message: 'Forbidden' })

    await context.db.delete(readingItems).where(eq(readingItems.id, input.id))
    return { success: true }
  }),

  markAsRead: o.input(z.object({ id: z.string() })).handler(async ({ context, input }) => {
    const user = requireUser(context)
    const existing = await context.db
      .select()
      .from(readingItems)
      .where(eq(readingItems.id, input.id))
      .get()
    if (!existing) throw new ORPCError('NOT_FOUND', { message: 'Reading item not found' })
    if (existing.userId !== user.id) throw new ORPCError('FORBIDDEN', { message: 'Forbidden' })

    const [updated] = await context.db
      .update(readingItems)
      .set({ status: 'read', progress: 100, updatedAt: new Date() })
      .where(eq(readingItems.id, input.id))
      .returning()
    return updated
  }),

  markAsSaved: o.input(z.object({ id: z.string() })).handler(async ({ context, input }) => {
    const user = requireUser(context)
    const existing = await context.db
      .select()
      .from(readingItems)
      .where(eq(readingItems.id, input.id))
      .get()
    if (!existing) throw new ORPCError('NOT_FOUND', { message: 'Reading item not found' })
    if (existing.userId !== user.id) throw new ORPCError('FORBIDDEN', { message: 'Forbidden' })

    const [updated] = await context.db
      .update(readingItems)
      .set({ status: 'saved', updatedAt: new Date() })
      .where(eq(readingItems.id, input.id))
      .returning()
    return updated
  }),
}

import { ORPCError, os } from '@orpc/server'
import { eq, and, or, lt, desc, inArray, SQL } from 'drizzle-orm'
import { articles, articleStates } from '@folio/db'
import type { Context } from './context'
import { createPaginatedResponse, type Cursor } from './lib/pagination'
import { z } from 'zod'

const o = os.$context<Context>()

function requireUser(context: Context) {
  if (!context.user) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Not authenticated' })
  }
  return context.user
}

const BySourceInput = z.object({
  sourceId: z.string(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
})

const ListWithCursorInput = z.object({
  sourceId: z.string().optional(),
  cursor: z
    .object({
      id: z.string(),
      publishedAt: z.union([z.iso.datetime(), z.string()]),
    })
    .optional(),
  limit: z.number().int().min(1).max(100).default(20),
})

function toCursorDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

export const articlesApi = {
  get: o.input(z.object({ id: z.string() })).handler(async ({ context, input }) => {
    const row = await context.db.select().from(articles).where(eq(articles.id, input.id)).get()
    if (!row) throw new ORPCError('NOT_FOUND', { message: 'Article not found' })
    return row
  }),

  bySource: o.input(BySourceInput).handler(async ({ context, input }) => {
    return context.db
      .select()
      .from(articles)
      .where(eq(articles.sourceId, input.sourceId))
      .orderBy(desc(articles.publishedAt))
      .limit(input.limit)
      .offset(input.offset)
      .all()
  }),

  list: o.input(ListWithCursorInput).handler(async ({ context, input }) => {
    const { sourceId, cursor, limit } = input
    const conditions: SQL[] = []

    if (sourceId) {
      conditions.push(eq(articles.sourceId, sourceId))
    }

    if (cursor) {
      const publishedAt = toCursorDate(cursor.publishedAt)
      conditions.push(
        or(
          lt(articles.publishedAt, publishedAt),
          and(eq(articles.publishedAt, publishedAt), lt(articles.id, cursor.id)),
        )!,
      )
    }

    const whereClause = conditions.length === 0 ? undefined : and(...conditions)

    const rows = await context.db
      .select()
      .from(articles)
      .where(whereClause)
      .orderBy(desc(articles.publishedAt), desc(articles.id))
      .limit(limit + 1)
      .all()

    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, -1) : rows
    const last = items[items.length - 1]
    const nextCursor: Cursor | undefined =
      hasMore && last
        ? {
            id: last.id,
            publishedAt:
              last.publishedAt instanceof Date
                ? last.publishedAt.toISOString()
                : new Date(last.publishedAt as unknown as string).toISOString(),
          }
        : undefined

    return createPaginatedResponse(items, hasMore, nextCursor)
  }),

  /** Return isRead map for the given article ids (current user). */
  states: o
    .input(z.object({ articleIds: z.array(z.string()).max(500) }))
    .handler(async ({ context, input }) => {
      const user = requireUser(context)
      if (input.articleIds.length === 0) return {} as Record<string, { isRead: boolean }>

      const rows = await context.db
        .select({
          articleId: articleStates.articleId,
          isRead: articleStates.isRead,
        })
        .from(articleStates)
        .where(
          and(
            eq(articleStates.userId, user.id),
            inArray(articleStates.articleId, input.articleIds),
          ),
        )
        .all()

      const map: Record<string, { isRead: boolean }> = {}
      for (const id of input.articleIds) {
        map[id] = { isRead: false }
      }
      for (const row of rows) {
        map[row.articleId] = { isRead: Boolean(row.isRead) }
      }
      return map
    }),

  setRead: o
    .input(z.object({ articleId: z.string(), isRead: z.boolean() }))
    .handler(async ({ context, input }) => {
      const user = requireUser(context)
      const article = await context.db
        .select()
        .from(articles)
        .where(eq(articles.id, input.articleId))
        .get()
      if (!article) throw new ORPCError('NOT_FOUND', { message: 'Article not found' })

      const existing = await context.db
        .select()
        .from(articleStates)
        .where(
          and(eq(articleStates.userId, user.id), eq(articleStates.articleId, input.articleId)),
        )
        .get()

      const now = new Date()
      if (existing) {
        const [updated] = await context.db
          .update(articleStates)
          .set({ isRead: input.isRead, updatedAt: now })
          .where(eq(articleStates.id, existing.id))
          .returning()
        return updated
      }

      const [created] = await context.db
        .insert(articleStates)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          articleId: input.articleId,
          isRead: input.isRead,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
      return created
    }),

  markRead: o.input(z.object({ articleId: z.string() })).handler(async ({ context, input }) => {
    const user = requireUser(context)
    const article = await context.db
      .select()
      .from(articles)
      .where(eq(articles.id, input.articleId))
      .get()
    if (!article) throw new ORPCError('NOT_FOUND', { message: 'Article not found' })

    const existing = await context.db
      .select()
      .from(articleStates)
      .where(and(eq(articleStates.userId, user.id), eq(articleStates.articleId, input.articleId)))
      .get()

    const now = new Date()
    if (existing) {
      if (existing.isRead) return existing
      const [updated] = await context.db
        .update(articleStates)
        .set({ isRead: true, updatedAt: now })
        .where(eq(articleStates.id, existing.id))
        .returning()
      return updated
    }

    const [created] = await context.db
      .insert(articleStates)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        articleId: input.articleId,
        isRead: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    return created
  }),
}

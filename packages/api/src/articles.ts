import { ORPCError, os } from '@orpc/server'
import { eq, and, or, lt, desc, SQL } from 'drizzle-orm'
import { articles } from '@folio/db'
import type { Context } from './context'
import { createPaginatedResponse, type Cursor } from './lib/pagination'
import { z } from 'zod'

const o = os.$context<Context>()

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
}

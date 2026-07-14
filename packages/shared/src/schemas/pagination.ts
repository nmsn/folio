import { z } from 'zod'

/**
 * Cursor-based pagination schema
 * Uses compound cursor (id + publishedAt) for stable ordering
 */
export const CursorSchema = z.object({
  id: z.string(),
  publishedAt: z.iso.datetime(),
})

export const CursorPaginationInputSchema = z.object({
  cursor: CursorSchema.optional(),
  limit: z.number().min(1).max(100).default(20),
})

export const CursorPaginationMetaSchema = z.object({
  hasMore: z.boolean(),
  nextCursor: CursorSchema.optional(),
  total: z.number().optional(),
})

export type Cursor = z.infer<typeof CursorSchema>
export type CursorPaginationInput = z.infer<typeof CursorPaginationInputSchema>
export type CursorPaginationMeta = z.infer<typeof CursorPaginationMetaSchema>

/**
 * Article list query with cursor pagination
 */
export const ArticleListWithCursorSchema = z.object({
  sourceId: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['unread', 'reading', 'read', 'saved']).optional(),
  cursor: CursorSchema.optional(),
  limit: z.number().min(1).max(100).default(20),
})

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[]
  meta: CursorPaginationMeta
}

export function createPaginatedResponse<T>(
  items: T[],
  hasMore: boolean,
  nextCursor?: Cursor,
  total?: number,
): PaginatedResponse<T> {
  return {
    items,
    meta: {
      hasMore,
      nextCursor,
      ...(total !== undefined && { total }),
    },
  }
}

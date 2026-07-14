import { ORPCError, os } from '@orpc/server'
import { eq, and, desc } from 'drizzle-orm'
import { rssSources } from '@folio/db'
import { z } from 'zod'
import type { Context } from './context'
import { CreateRSSSourceSchema, UpdateRSSSourceSchema } from './lib/schemas'
import { parseOPML, generateOPML, extractFeedUrls, type OPML } from './lib/opml'

const o = os.$context<Context>()

function requireUser(context: Context) {
  if (!context.user) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Not authenticated' })
  }
  return context.user
}

export const feedsApi = {
  list: o.handler(async ({ context }) => {
    const user = context.user
    if (!user) {
      // Dev bypass: unauthenticated returns all feeds (matches NestJS behavior)
      return context.db.select().from(rssSources).orderBy(desc(rssSources.createdAt)).all()
    }
    return context.db
      .select()
      .from(rssSources)
      .where(eq(rssSources.userId, user.id))
      .orderBy(desc(rssSources.createdAt))
      .all()
  }),

  get: o.input(z.object({ id: z.string() })).handler(async ({ context, input }) => {
    const feed = await context.db
      .select()
      .from(rssSources)
      .where(eq(rssSources.id, input.id))
      .get()
    if (!feed) throw new ORPCError('NOT_FOUND', { message: 'Feed not found' })
    if (context.user && feed.userId !== context.user.id) {
      throw new ORPCError('FORBIDDEN', { message: 'Forbidden' })
    }
    return feed
  }),

  create: o.input(CreateRSSSourceSchema).handler(async ({ context, input }) => {
    const user = requireUser(context)
    const id = crypto.randomUUID()
    const now = new Date()
    const [feed] = await context.db
      .insert(rssSources)
      .values({
        id,
        userId: user.id,
        name: input.name,
        url: input.url,
        description: input.description,
        category: input.category,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    return feed
  }),

  update: o
    .input(z.object({ id: z.string() }).merge(UpdateRSSSourceSchema))
    .handler(async ({ context, input }) => {
      const user = requireUser(context)
      const existing = await context.db
        .select()
        .from(rssSources)
        .where(eq(rssSources.id, input.id))
        .get()
      if (!existing) throw new ORPCError('NOT_FOUND', { message: 'Feed not found' })
      if (existing.userId !== user.id) throw new ORPCError('FORBIDDEN', { message: 'Forbidden' })

      const { id, ...patch } = input
      const [updated] = await context.db
        .update(rssSources)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(rssSources.id, id))
        .returning()
      return updated
    }),

  delete: o.input(z.object({ id: z.string() })).handler(async ({ context, input }) => {
    const user = requireUser(context)
    const existing = await context.db
      .select()
      .from(rssSources)
      .where(eq(rssSources.id, input.id))
      .get()
    if (!existing) throw new ORPCError('NOT_FOUND', { message: 'Feed not found' })
    if (existing.userId !== user.id) throw new ORPCError('FORBIDDEN', { message: 'Forbidden' })

    await context.db.delete(rssSources).where(eq(rssSources.id, input.id))
    return { success: true }
  }),

  refresh: o.input(z.object({ id: z.string() })).handler(async ({ context, input }) => {
    const user = context.user
    const feed = await context.db
      .select()
      .from(rssSources)
      .where(eq(rssSources.id, input.id))
      .get()
    if (!feed) throw new ORPCError('NOT_FOUND', { message: 'Feed not found' })
    if (user && feed.userId !== user.id) {
      throw new ORPCError('FORBIDDEN', { message: 'Forbidden' })
    }

    if (context.env.FEED_QUEUE) {
      await context.env.FEED_QUEUE.send({ type: 'feed.fetch', feedId: input.id })
      return { success: true, queued: true }
    }

    // Queue not bound yet (pre-Phase 5) — caller/worker may handle synchronously
    return { success: true, queued: false, feedId: input.id }
  }),

  exportOpml: o.handler(async ({ context }) => {
    const user = requireUser(context)
    const feeds = await context.db
      .select()
      .from(rssSources)
      .where(eq(rssSources.userId, user.id))
      .all()

    const opml: OPML = {
      version: '2.0',
      head: {
        title: 'folio Subscriptions',
        dateCreated: new Date().toUTCString(),
      },
      body: feeds.map((feed) => ({
        text: feed.name || '',
        title: feed.name,
        type: 'rss',
        xmlUrl: feed.url,
        htmlUrl: feed.description || undefined,
        category: feed.category || undefined,
      })),
    }

    return { xml: generateOPML(opml) }
  }),

  importOpml: o
    .input(z.object({ opml: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const user = requireUser(context)

      let opml: OPML
      try {
        opml = parseOPML(input.opml)
      } catch {
        throw new ORPCError('BAD_REQUEST', { message: 'Invalid OPML format' })
      }

      const feedUrls = extractFeedUrls(opml)
      const results = {
        imported: 0,
        failed: 0,
        errors: [] as Array<{ url: string; error: string }>,
        feeds: [] as Array<{ name: string; url: string; id: string }>,
      }

      for (const feedInfo of feedUrls) {
        try {
          const existing = await context.db
            .select()
            .from(rssSources)
            .where(and(eq(rssSources.userId, user.id), eq(rssSources.url, feedInfo.url)))
            .get()

          if (existing) {
            results.feeds.push({ name: existing.name, url: existing.url, id: existing.id })
            results.imported++
            continue
          }

          const id = crypto.randomUUID()
          const now = new Date()
          const [feed] = await context.db
            .insert(rssSources)
            .values({
              id,
              userId: user.id,
              name: feedInfo.text || feedInfo.url,
              url: feedInfo.url,
              category: feedInfo.category,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            })
            .returning()

          results.feeds.push({ name: feed.name, url: feed.url, id: feed.id })
          results.imported++
        } catch (error) {
          results.failed++
          results.errors.push({
            url: feedInfo.url,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return results
    }),
}

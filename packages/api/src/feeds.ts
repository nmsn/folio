import { ORPCError, os } from '@orpc/server'
import { eq, and, desc } from 'drizzle-orm'
import { rssSources } from '@folio/db'
import { z } from 'zod'
import type { Context } from './context'
import { CreateRSSSourceSchema, UpdateRSSSourceSchema } from './lib/schemas'
import { parseOPML, generateOPML, extractFeedUrls, type OPML } from './lib/opml'
import { enqueueOrFetchFeed } from './lib/feed-fetch'

const o = os.$context<Context>()

function requireUser(context: Context) {
  if (!context.user) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Not authenticated' })
  }
  return context.user
}

function defaultFeedName(url: string, name?: string) {
  if (name?.trim()) return name.trim()
  try {
    return new URL(url).hostname
  } catch {
    return 'Untitled Feed'
  }
}

export const feedsApi = {
  list: o.handler(async ({ context }) => {
    const user = requireUser(context)
    return context.db
      .select()
      .from(rssSources)
      .where(eq(rssSources.userId, user.id))
      .orderBy(desc(rssSources.createdAt))
      .all()
  }),

  get: o.input(z.object({ id: z.string() })).handler(async ({ context, input }) => {
    const user = requireUser(context)
    const feed = await context.db
      .select()
      .from(rssSources)
      .where(eq(rssSources.id, input.id))
      .get()
    if (!feed) throw new ORPCError('NOT_FOUND', { message: 'Feed not found' })
    if (feed.userId !== user.id) {
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
        name: defaultFeedName(input.url, input.name),
        url: input.url,
        description: input.description,
        category: input.category,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const fetchResult = await enqueueOrFetchFeed(context.env, id)

    // Re-read in case inline fetch updated name/description from channel metadata
    const refreshed = await context.db.select().from(rssSources).where(eq(rssSources.id, id)).get()

    return {
      ...(refreshed ?? feed),
      queued: fetchResult.queued,
      newArticles: fetchResult.newArticles ?? 0,
    }
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
    const user = requireUser(context)
    const feed = await context.db
      .select()
      .from(rssSources)
      .where(eq(rssSources.id, input.id))
      .get()
    if (!feed) throw new ORPCError('NOT_FOUND', { message: 'Feed not found' })
    if (feed.userId !== user.id) {
      throw new ORPCError('FORBIDDEN', { message: 'Forbidden' })
    }

    const result = await enqueueOrFetchFeed(context.env, input.id)
    return {
      success: true,
      queued: result.queued,
      newArticles: result.newArticles ?? 0,
      feedId: input.id,
    }
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

          await enqueueOrFetchFeed(context.env, id)

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

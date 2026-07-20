import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { articles, rssSources } from '@folio/db'
import type { CloudflareEnv } from '../env'
import { fetchFeed } from './rss/fetch-feed'
import { parseFeed } from './rss/parse-feed'

export type FeedFetchMessage = {
  type: 'feed.fetch'
  feedId: string
}

export type FeedFetchResult = {
  newArticles: number
  notModified?: boolean
  feedTitle?: string
}

export async function handleFeedFetch(env: CloudflareEnv, feedId: string): Promise<FeedFetchResult> {
  const db = drizzle(env.DB)
  const feed = await db.select().from(rssSources).where(eq(rssSources.id, feedId)).get()
  if (!feed) {
    console.error(`Feed not found: ${feedId}`)
    return { newArticles: 0 }
  }

  const options: { lastModified?: string } = {}
  if (feed.lastFetchedAt) {
    const ms =
      feed.lastFetchedAt instanceof Date
        ? feed.lastFetchedAt.getTime()
        : new Date(feed.lastFetchedAt as unknown as string).getTime()
    options.lastModified = new Date(ms).toUTCString()
  }

  const result = await fetchFeed(feed.url, options)
  if (!result.content || result.notModified) {
    return { newArticles: 0, notModified: true }
  }

  const parsed = parseFeed(result.content, feed.url)
  let created = 0

  for (const article of parsed.articles) {
    const link = article.link || article.guid
    if (!link) continue

    const existing = await db
      .select()
      .from(articles)
      .where(and(eq(articles.sourceId, feedId), eq(articles.url, link)))
      .get()
    if (existing) continue

    const id = crypto.randomUUID()
    const now = new Date()
    await db.insert(articles).values({
      id,
      sourceId: feedId,
      title: article.title,
      url: link,
      author: article.author,
      description: article.description,
      content: article.content,
      imageUrl: article.imageUrl,
      publishedAt: article.pubDate || now,
      createdAt: now,
      updatedAt: now,
    })
    created++

    if (env.FULLTEXT_QUEUE) {
      await env.FULLTEXT_QUEUE.send({
        type: 'article.fulltext-fetch',
        articleId: id,
        url: link,
      })
    }
  }

  const namePatch =
    (!feed.name || feed.name === 'Untitled Feed' || feed.name === new URL(feed.url).hostname) &&
    parsed.title
      ? { name: parsed.title }
      : {}

  await db
    .update(rssSources)
    .set({
      lastFetchedAt: new Date(),
      updatedAt: new Date(),
      ...namePatch,
      ...(parsed.description && !feed.description ? { description: parsed.description } : {}),
      ...(parsed.iconUrl && !feed.iconUrl ? { iconUrl: parsed.iconUrl } : {}),
    })
    .where(eq(rssSources.id, feedId))

  console.log(`Fetched ${created} new articles from feed ${feedId}`)
  return { newArticles: created, feedTitle: parsed.title }
}

/**
 * Enqueue feed.fetch when FEED_QUEUE is bound; otherwise run inline.
 * Cron / create / refresh all use this path.
 */
export async function enqueueOrFetchFeed(
  env: CloudflareEnv,
  feedId: string,
): Promise<{ queued: boolean; newArticles?: number; feedTitle?: string }> {
  if (env.FEED_QUEUE) {
    await env.FEED_QUEUE.send({ type: 'feed.fetch', feedId })
    return { queued: true }
  }
  const result = await handleFeedFetch(env, feedId)
  return { queued: false, newArticles: result.newArticles, feedTitle: result.feedTitle }
}

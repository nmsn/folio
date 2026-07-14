import { drizzle } from 'drizzle-orm/d1'
import { eq, or, isNull, lt, and } from 'drizzle-orm'
import { rssSources } from '@folio/db'
import type { CloudflareEnv } from '@folio/api/env'

/**
 * Cron-triggered feed refresh scheduler.
 * Enqueues feed.fetch jobs for active sources that haven't been fetched recently.
 */
export async function runFeedScheduler(env: CloudflareEnv) {
  console.log('Running feed refresh scheduler...')
  const db = drizzle(env.DB)

  const staleBefore = new Date(Date.now() - 15 * 60 * 1000) // 15 minutes
  const feeds = await db
    .select()
    .from(rssSources)
    .where(
      and(
        eq(rssSources.isActive, true),
        or(isNull(rssSources.lastFetchedAt), lt(rssSources.lastFetchedAt, staleBefore)),
      ),
    )
    .all()

  if (!env.FEED_QUEUE) {
    console.warn('FEED_QUEUE not bound — running fetch inline for', feeds.length, 'feeds')
    const { handleFeedFetch } = await import('../feed-fetch.handler')
    for (const feed of feeds) {
      try {
        await handleFeedFetch(env, feed.id)
      } catch (err) {
        console.error(`Scheduler fetch failed for ${feed.id}:`, err)
      }
    }
    return { enqueued: feeds.length, mode: 'inline' as const }
  }

  let enqueued = 0
  for (const feed of feeds) {
    await env.FEED_QUEUE.send({ type: 'feed.fetch', feedId: feed.id })
    enqueued++
  }

  console.log(`Enqueued ${enqueued} feed.fetch jobs`)
  return { enqueued, mode: 'queue' as const }
}

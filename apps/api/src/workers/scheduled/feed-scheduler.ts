import { drizzle } from 'drizzle-orm/d1'
import { eq, or, isNull, lt, and } from 'drizzle-orm'
import { rssSources } from '@folio/db'
import type { CloudflareEnv } from '@folio/api/env'
import { enqueueOrFetchFeed } from '@folio/api'

/**
 * Cron-triggered feed refresh scheduler.
 * Enqueues feed.fetch jobs for active sources that haven't been fetched recently.
 * When FEED_QUEUE is unbound (local), runs fetches inline via enqueueOrFetchFeed.
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

  let enqueued = 0
  let mode: 'queue' | 'inline' = env.FEED_QUEUE ? 'queue' : 'inline'
  for (const feed of feeds) {
    try {
      const result = await enqueueOrFetchFeed(env, feed.id)
      if (result.queued) mode = 'queue'
      else mode = 'inline'
      enqueued++
    } catch (err) {
      console.error(`Scheduler fetch failed for ${feed.id}:`, err)
    }
  }

  console.log(`Scheduled ${enqueued} feed.fetch jobs (mode=${mode})`)
  return { enqueued, mode }
}

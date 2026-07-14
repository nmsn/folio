import type { RouterClient } from '@orpc/server'
import { connection, db, kv, r2 } from './health-check'
import { articlesApi } from './articles'
import { feedsApi } from './feeds'
import { readingApi } from './reading'
import { aiApi } from './ai'
import { authApi } from './auth'

export const appRouter = {
  healthCheck: {
    connection,
    kv,
    db,
    r2,
  },
  articles: articlesApi,
  feeds: feedsApi,
  reading: readingApi,
  ai: aiApi,
  auth: authApi,
}

export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>

export type { Context } from './context'
export type { CloudflareEnv } from './env'

// Re-export schemas / helpers previously in @folio/shared
export * from './lib/schemas'
export * from './lib/pagination'
export * from './lib/opml'
export { ClaudeClient } from './lib/claude'
export type { AISummarizeResult, AIAnswerResult, AIFilterResult } from './lib/claude'

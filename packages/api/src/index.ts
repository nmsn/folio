import type { RouterClient } from '@orpc/server'
import { connection, db, kv, r2 } from './health-check'
import { articlesApi } from './articles'
import { feedsApi } from './feeds'
import { readingApi } from './reading'
import { aiApi } from './ai'

export { createAuth } from './auth-server'
export type { FolioAuth } from './auth-server'
export {
  signInWithEmail,
  signUpWithEmail,
  signOutWithBearer,
  type BearerAuthUser,
} from './auth-bearer'

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

/**
 * Cloudflare Workers bindings for Folio API.
 * Alchemy (Phase 5) will refine these from the resource graph; Phase 4 uses this shape.
 *
 * D1Database / KVNamespace / etc. come from `@cloudflare/workers-types` when that
 * package is in the consuming project's `types` (server). For client packages that
 * only need `AppRouterClient`, these are structural placeholders.
 */
export type CloudflareEnv = {
  // oxlint-disable-next-line no-explicit-any -- Workers binding types resolved on the server
  DB: any
  KV?: any
  BUCKET?: any
  CORS_ORIGIN?: string
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL?: string
  ANTHROPIC_API_KEY?: string
  R2_PUBLIC_DOMAIN?: string
  R2_ACCOUNT_ID?: string
  R2_BUCKET_NAME?: string
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  FEED_QUEUE?: {
    send(message: unknown): Promise<void>
  }
  FULLTEXT_QUEUE?: {
    send(message: unknown): Promise<void>
  }
  AI_QUEUE?: {
    send(message: unknown): Promise<void>
  }
}

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@folio/db'
import type { CloudflareEnv } from './env'

export function createAuth(env: CloudflareEnv) {
  const db = drizzle(env.DB, { schema })
  const origins = (env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    plugins: [bearer()],
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL || 'http://localhost:4000',
    trustedOrigins: origins,
    advanced: {
      // Workers / D1 run on edge; disable cross-subdomain cookie quirks for local
      defaultCookieAttributes: {
        sameSite: 'lax',
        secure: (env.BETTER_AUTH_URL || '').startsWith('https'),
      },
    },
  })
}

export type FolioAuth = ReturnType<typeof createAuth>

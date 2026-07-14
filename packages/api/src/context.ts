import type { Context as HonoContext } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, gt } from 'drizzle-orm'
import { users, sessions } from '@folio/db'
import type { CloudflareEnv } from './env'

export type SessionUser = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
}

function extractSessionId(c: HonoContext): string | null {
  const auth = c.req.header('authorization')
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim() || null
  }
  const cookie = c.req.header('cookie')
  if (!cookie) return null
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export async function createContext(c: HonoContext<{ Bindings: CloudflareEnv }>) {
  const env = c.env
  const db = drizzle(env.DB)
  const sessionId = extractSessionId(c)

  let user: SessionUser | null = null
  if (sessionId) {
    const row = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
      .get()

    if (row) {
      user = {
        id: row.id,
        email: row.email,
        name: row.name,
        avatarUrl: row.avatarUrl,
      }
    }
  }

  return {
    env,
    db,
    user,
    sessionId,
    request: c.req.raw,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>

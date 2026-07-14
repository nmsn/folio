import type { Context as HonoContext } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@folio/db'
import type { CloudflareEnv } from './env'
import { createAuth } from './auth-server'

export type SessionUser = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
}

export async function createContext(c: HonoContext<{ Bindings: CloudflareEnv }>) {
  const env = c.env
  const db = drizzle(env.DB, { schema })
  const auth = createAuth(env)

  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  const user: SessionUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatarUrl: session.user.image ?? null,
      }
    : null

  return {
    env,
    db,
    auth,
    user,
    session: session?.session ?? null,
    request: c.req.raw,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>

import { ORPCError, os } from '@orpc/server'
import { eq } from 'drizzle-orm'
import { users, sessions } from '@folio/db'
import type { Context } from './context'
import { SignInSchema, SignUpSchema } from './lib/schemas'
import { hashPassword, verifyPassword, sessionExpiresAt } from './lib/auth'

const o = os.$context<Context>()

function publicUser(row: { id: string; email: string; name: string; avatarUrl?: string | null }) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl ?? undefined,
  }
}

export const authApi = {
  signup: o.input(SignUpSchema).handler(async ({ context, input }) => {
    const existing = await context.db.select().from(users).where(eq(users.email, input.email)).get()
    if (existing) {
      throw new ORPCError('CONFLICT', { message: 'Email already in use' })
    }

    const { hash, salt } = await hashPassword(input.password)
    const id = crypto.randomUUID()
    const now = new Date()

    const [user] = await context.db
      .insert(users)
      .values({
        id,
        email: input.email,
        name: input.name,
        passwordHash: `${hash}:${salt}`,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const sessionId = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const expiresAt = sessionExpiresAt()
    await context.db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
      createdAt: now,
    })

    return {
      user: publicUser(user),
      session: { sessionId, expiresAt },
    }
  }),

  signin: o.input(SignInSchema).handler(async ({ context, input }) => {
    const user = await context.db.select().from(users).where(eq(users.email, input.email)).get()
    if (!user?.passwordHash) {
      throw new ORPCError('UNAUTHORIZED', { message: 'Invalid credentials' })
    }

    const valid = await verifyPassword(input.password, user.passwordHash)
    if (!valid) {
      throw new ORPCError('UNAUTHORIZED', { message: 'Invalid credentials' })
    }

    const sessionId = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const expiresAt = sessionExpiresAt()
    await context.db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
      createdAt: new Date(),
    })

    return {
      user: publicUser(user),
      session: { sessionId, expiresAt },
    }
  }),

  signout: o.handler(async ({ context }) => {
    if (context.sessionId) {
      await context.db.delete(sessions).where(eq(sessions.id, context.sessionId))
    }
    return { success: true }
  }),

  getSession: o.handler(async ({ context }) => {
    if (!context.user) return { user: null }
    return { user: publicUser(context.user) }
  }),
}

import { eq } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from '@folio/db'
import { user } from '@folio/db'

export type SessionUser = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
}

/** Fixed local user for no-login RSS MVP. Auth remains available for later. */
export const LOCAL_USER_ID = 'local-dev-user'
export const LOCAL_USER_EMAIL = 'local@folio.dev'
export const LOCAL_USER_NAME = 'Local'

type AppDb = DrizzleD1Database<typeof schema>

/**
 * Ensure the local-dev user exists and return a SessionUser.
 */
export async function ensureLocalUser(db: AppDb): Promise<SessionUser> {
  const existing = await db.select().from(user).where(eq(user.id, LOCAL_USER_ID)).get()
  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      avatarUrl: existing.image ?? null,
    }
  }

  const now = new Date()
  await db.insert(user).values({
    id: LOCAL_USER_ID,
    name: LOCAL_USER_NAME,
    email: LOCAL_USER_EMAIL,
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  })

  return {
    id: LOCAL_USER_ID,
    email: LOCAL_USER_EMAIL,
    name: LOCAL_USER_NAME,
    avatarUrl: null,
  }
}

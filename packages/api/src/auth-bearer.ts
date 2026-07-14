/**
 * Shared better-auth helpers for non-web clients (bearer plugin).
 * Web uses cookie session via better-auth/react instead.
 *
 * Token is returned in the `set-auth-token` response header (bearer plugin).
 */

export type BearerAuthUser = {
  id: string
  email: string
  name: string
  image?: string | null
}

function authBase(apiBase: string) {
  return `${apiBase.replace(/\/$/, '')}/api/auth`
}

async function parseAuthSuccess(res: Response): Promise<{ token: string; user: BearerAuthUser }> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      (body as { message?: string }).message || `Auth failed (${res.status})`,
    )
  }
  const token = res.headers.get('set-auth-token')
  const data = (await res.json()) as { user?: BearerAuthUser }
  if (!token) {
    throw new Error(
      'Missing set-auth-token header (enable bearer plugin and CORS exposeHeaders)',
    )
  }
  if (!data.user) {
    throw new Error('Auth response missing user')
  }
  return { token, user: data.user }
}

export async function signInWithEmail(
  apiBase: string,
  email: string,
  password: string,
): Promise<{ token: string; user: BearerAuthUser }> {
  const res = await fetch(`${authBase(apiBase)}/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return parseAuthSuccess(res)
}

export async function signUpWithEmail(
  apiBase: string,
  input: { name: string; email: string; password: string },
): Promise<{ token: string; user: BearerAuthUser }> {
  const res = await fetch(`${authBase(apiBase)}/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseAuthSuccess(res)
}

export async function signOutWithBearer(apiBase: string, token: string): Promise<void> {
  await fetch(`${authBase(apiBase)}/sign-out`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  })
}

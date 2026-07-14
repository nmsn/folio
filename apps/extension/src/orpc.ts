import { createORPCClient, onError } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { AppRouterClient } from '@folio/api'
import {
  signInWithEmail,
  signUpWithEmail,
  signOutWithBearer,
} from '@folio/api/auth-bearer'

const SESSION_KEY = 'folio_session'

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function setSessionToken(token: string | null) {
  try {
    if (token) localStorage.setItem(SESSION_KEY, token)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

function getApiBase() {
  return (
    (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ||
    'http://localhost:4000'
  )
}

export const link = new RPCLink({
  url: `${getApiBase()}/rpc`,
  headers: () => {
    const token = getSessionToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  },
  interceptors: [
    onError((error) => {
      if ((error as Error).name === 'AbortError') return
      console.error(error)
    }),
  ],
})

export const client: AppRouterClient = createORPCClient(link)
export const orpc = createTanstackQueryUtils(client)

export async function authSignIn(email: string, password: string) {
  const { token, user } = await signInWithEmail(getApiBase(), email, password)
  setSessionToken(token)
  return user
}

export async function authSignUp(name: string, email: string, password: string) {
  const { token, user } = await signUpWithEmail(getApiBase(), { name, email, password })
  setSessionToken(token)
  return user
}

export async function authSignOut() {
  const token = getSessionToken()
  if (token) {
    try {
      await signOutWithBearer(getApiBase(), token)
    } finally {
      setSessionToken(null)
    }
  }
}

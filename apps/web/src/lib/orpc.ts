import { createORPCClient, onError } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { AppRouterClient } from '@folio/api'

const SESSION_KEY = 'folio_session'

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(SESSION_KEY)
}

export function setSessionToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem(SESSION_KEY, token)
  else localStorage.removeItem(SESSION_KEY)
}

function getApiBase() {
  // Prefer VITE_API_URL; in browser default to same-origin so Vinxi devProxy `/rpc` → :4000 works.
  if (typeof window !== 'undefined') {
    return (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL || ''
  }
  return process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:4000'
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

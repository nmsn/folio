import { createORPCClient, onError } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { AppRouterClient } from '@folio/api'

const SESSION_KEY = 'folio_session'

export function getSessionToken(): string | null {
  try {
    // AsyncStorage would be better; localStorage polyfill / memory for now
    return globalThis.localStorage?.getItem(SESSION_KEY) ?? null
  } catch {
    return null
  }
}

export function setSessionToken(token: string | null) {
  try {
    if (token) globalThis.localStorage?.setItem(SESSION_KEY, token)
    else globalThis.localStorage?.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

function getApiBase() {
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'
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

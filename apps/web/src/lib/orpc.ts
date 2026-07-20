import { createORPCClient, onError } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { AppRouterClient } from '@folio/api'

function getApiBase() {
  // Prefer VITE_API_URL; in browser default to same-origin so Vinxi devProxy works.
  // Must be an absolute URL: @orpc/client does `new URL(baseUrl)` which throws on relative paths.
  if (typeof window !== 'undefined') {
    return (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL || window.location.origin
  }
  return process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:4000'
}

export const link = new RPCLink({
  url: `${getApiBase()}/rpc`,
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      credentials: 'include',
    }),
  interceptors: [
    onError((error) => {
      if ((error as Error).name === 'AbortError') return
      console.error(error)
    }),
  ],
})

export const client: AppRouterClient = createORPCClient(link)

export const orpc = createTanstackQueryUtils(client)

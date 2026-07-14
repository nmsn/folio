import { createORPCClient, onError } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { AppRouterClient } from '@folio/api'

function getApiBase() {
  return (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL || 'http://localhost:4000'
}

export const link = new RPCLink({
  url: `${getApiBase()}/rpc`,
  interceptors: [
    onError((error) => {
      if ((error as Error).name === 'AbortError') return
      console.error(error)
    }),
  ],
})

export const client: AppRouterClient = createORPCClient(link)
export const orpc = createTanstackQueryUtils(client)

import { createAuthClient } from 'better-auth/react'

function getAuthBaseURL() {
  if (typeof window !== 'undefined') {
    // Same-origin → Vinxi proxies /api/auth → alchemy :4000
    return (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL || window.location.origin
  }
  return process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:4000'
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
})

export const { signIn, signUp, signOut, useSession } = authClient

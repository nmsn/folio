/**
 * Home-grown SHA-256 + salt password hashing (Workers Web Crypto).
 * Format stored: `${hexHash}:${salt}`
 */

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(
  password: string,
  salt?: string,
): Promise<{ hash: string; salt: string }> {
  const resolvedSalt = salt || crypto.randomUUID().replace(/-/g, '')
  const data = new TextEncoder().encode(password + resolvedSalt)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return { hash: toHex(digest), salt: resolvedSalt }
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [hash, salt] = storedHash.split(':')
  if (!hash || !salt) return false
  const { hash: computed } = await hashPassword(password, salt)
  return hash === computed
}

export function sessionExpiresAt(days = 30): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

import { useState, useEffect } from 'react'
import { client, setSessionToken, getSessionToken } from '../lib/orpc'

interface User {
  id: string
  email: string
  name: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkSession = async () => {
    try {
      if (!getSessionToken()) {
        setUser(null)
        return
      }
      const res = await client.auth.getSession()
      setUser(res.user)
    } catch {
      setUser(null)
      setSessionToken(null)
    } finally {
      setLoading(false)
    }
  }

  const signin = async (email: string, password: string) => {
    const res = await client.auth.signin({ email, password })
    setSessionToken(res.session.sessionId)
    setUser(res.user)
    return res.user
  }

  const signout = async () => {
    try {
      await client.auth.signout()
    } finally {
      setSessionToken(null)
      setUser(null)
    }
  }

  const signup = async (name: string, email: string, password: string) => {
    const res = await client.auth.signup({ name, email, password })
    setSessionToken(res.session.sessionId)
    setUser(res.user)
    return res.user
  }

  useEffect(() => {
    checkSession()
  }, [])

  return { user, loading, signin, signout, signup }
}

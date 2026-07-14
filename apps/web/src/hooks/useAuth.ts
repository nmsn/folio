import { useSession, signIn, signUp, signOut } from '../lib/auth-client'

export function useAuth() {
  const { data, isPending, error, refetch } = useSession()

  const user = data?.user
    ? {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        image: data.user.image ?? null,
      }
    : null

  const signin = async (email: string, password: string) => {
    const res = await signIn.email({ email, password })
    if (res.error) throw new Error(res.error.message || 'Sign in failed')
    await refetch()
    return res.data?.user
  }

  const signup = async (name: string, email: string, password: string) => {
    const res = await signUp.email({ name, email, password })
    if (res.error) throw new Error(res.error.message || 'Sign up failed')
    await refetch()
    return res.data?.user
  }

  const logout = async () => {
    await signOut()
    await refetch()
  }

  return {
    user,
    loading: isPending,
    error,
    signin,
    signup,
    signout: logout,
    refetch,
  }
}

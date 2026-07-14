import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { auth as authApi } from './api'
import type { UserRole } from './nav'

interface User {
  id: string
  role: UserRole
  name: string
  email: string
  customerId: string | null
  staffId: string | null
  managerElevatedUntil: string | null
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.getMe()
      setUser(me as User)
      setError(null)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const signIn = async (email: string, password: string) => {
    setError(null)
    try {
      await authApi.signIn(email, password)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed')
      throw e
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    setError(null)
    try {
      await authApi.signUp(email, password, name)
      await authApi.signIn(email, password)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed')
      throw e
    }
  }

  const signOut = async () => {
    await authApi.signOut().catch(() => {})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signUp, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

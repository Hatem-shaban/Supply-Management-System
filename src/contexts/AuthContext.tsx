'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  role: string
  loading: boolean
  accessToken: string
  signOut: () => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'user',
  loading: true,
  accessToken: '',
  signOut: async () => {},
  refreshToken: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState('')

  // Fetch user role from database
  const fetchUserRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single()
      if (data) setRole(data.role)
    } catch (error) {
      console.error('Failed to fetch user role:', error)
    }
  }

  // Refresh token proactively
  const refreshToken = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.warn('Token refresh failed:', error.message)
        return
      }
      if (data.session?.access_token) {
        setAccessToken(data.session.access_token)
      }
    } catch (error) {
      console.error('Token refresh error:', error)
    }
  }

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setAccessToken(session.access_token)
        await fetchUserRole(session.user.id)
      } else {
        setUser(null)
        setRole('user')
        setAccessToken('')
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Set up token refresh interval (refresh every 50 minutes to prevent expiration)
  // Supabase tokens typically expire after 1 hour, so refresh before expiration
  useEffect(() => {
    if (!user) return

    const refreshInterval = setInterval(() => {
      refreshToken()
    }, 50 * 60 * 1000) // 50 minutes

    return () => clearInterval(refreshInterval)
  }, [user])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
    setUser(null)
    setRole('user')
    setAccessToken('')
    // Use setTimeout to ensure state is cleared before redirect
    setTimeout(() => {
      window.location.href = '/'
    }, 100)
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, accessToken, signOut, refreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

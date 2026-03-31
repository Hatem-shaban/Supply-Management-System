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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'user',
  loading: true,
  accessToken: '',
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState('')

  useEffect(() => {
    // onAuthStateChange fires immediately with the current session — use it as the source of truth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setAccessToken(session.access_token)
        const { data } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        if (data) setRole(data.role)
      } else {
        setUser(null)
        setRole('user')
        setAccessToken('')
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      // Even if signOut fails, clear local state
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
    <AuthContext.Provider value={{ user, role, loading, accessToken, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

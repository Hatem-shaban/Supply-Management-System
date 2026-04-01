'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type AppUser = {
  id: string
  username: string
  full_name: string
  role: string
}

type AuthContextType = {
  user: AppUser | null
  role: string
  loading: boolean
  signOut: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'user',
  loading: true,
  signOut: () => {},
})

const SESSION_KEY = 'app_session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) {
        const session = JSON.parse(raw) as { user: AppUser; token: string }
        if (session?.user?.id) {
          setUser(session.user)
          setRole(session.user.role)
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY)
    }
    setLoading(false)
  }, [])

  const signOut = () => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
    setRole('user')
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)


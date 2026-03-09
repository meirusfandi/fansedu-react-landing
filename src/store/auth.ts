import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../types/auth'

interface AuthStore {
  user: AuthUser | null
  token: string | null
  login: (user: AuthUser, token: string) => void
  logout: () => void
  setUser: (user: AuthUser | null) => void
  isAuthenticated: () => boolean
  hasRole: (role: AuthUser['role']) => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      setUser: (user) => set({ user }),
      isAuthenticated: () => !!get().user && !!get().token,
      hasRole: (role) => get().user?.role === role,
    }),
    { name: 'fansedu-auth' }
  )
)

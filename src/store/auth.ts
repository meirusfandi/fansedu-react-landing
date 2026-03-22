import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { AuthUser } from '../types/auth'

interface AuthStore {
  user: AuthUser | null
  token: string | null
  rememberMe: boolean
  login: (user: AuthUser, token: string, rememberMe?: boolean) => void
  logout: () => void
  setUser: (user: AuthUser | null) => void
  isAuthenticated: () => boolean
  hasRole: (role: AuthUser['role']) => boolean
}

const authStorage: StateStorage = {
  getItem: (name) => {
    const localValue = localStorage.getItem(name)
    if (localValue) return localValue
    return sessionStorage.getItem(name)
  },
  setItem: (name, value) => {
    try {
      const parsed = JSON.parse(value) as { state?: { rememberMe?: boolean } }
      const shouldPersist = parsed?.state?.rememberMe !== false
      if (shouldPersist) {
        localStorage.setItem(name, value)
        sessionStorage.removeItem(name)
      } else {
        sessionStorage.setItem(name, value)
        localStorage.removeItem(name)
      }
    } catch {
      localStorage.setItem(name, value)
    }
  },
  removeItem: (name) => {
    localStorage.removeItem(name)
    sessionStorage.removeItem(name)
  },
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      rememberMe: true,
      login: (user, token, rememberMe = true) => set({ user, token, rememberMe }),
      logout: () => set({ user: null, token: null, rememberMe: true }),
      setUser: (user) => set({ user }),
      isAuthenticated: () => !!get().user && !!get().token,
      hasRole: (role) => get().user?.role === role,
    }),
    {
      name: 'fansedu-auth',
      storage: createJSONStorage(() => authStorage),
    }
  )
)

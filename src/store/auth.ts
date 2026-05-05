import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { isAuthUserBlockedFromLmsPortal, normalizeAuthFields, type AuthUser } from '../types/auth'

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
      version: 2,
      storage: createJSONStorage(() => sessionStorage),
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== 'object') return persisted
        const p = persisted as {
          state?: { user?: { role?: string; roleCode?: string }; token?: string | null; rememberMe?: boolean }
        }
        if (!p.state?.user) return { ...p, version: 2 }
        const u = p.state.user
        const nextRole = normalizeAuthFields(u.role, u.roleCode, null)
        const userPatched = { ...u, role: nextRole } as AuthUser
        if (isAuthUserBlockedFromLmsPortal(userPatched)) {
          return {
            ...p,
            version: 2,
            state: { ...p.state, user: null, token: null, rememberMe: p.state.rememberMe ?? true },
          }
        }
        return {
          ...p,
          version: 2,
          state: { ...p.state, user: userPatched },
        }
      },
    },
  ),
)

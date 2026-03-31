import { useEffect, useLayoutEffect } from 'react'
import { useAuthStore } from '../../store/auth'
import { isAuthUserBlockedFromLmsPortal, type UserRole } from '../../types/auth'

interface AuthGuardProps {
  children: React.ReactNode
  role?: UserRole
  currentPath: string
  onRedirect: (path: string) => void
}

export function AuthGuard({ children, role, currentPath, onRedirect }: AuthGuardProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())

  useLayoutEffect(() => {
    if (!user) return
    if (!isAuthUserBlockedFromLmsPortal(user)) return
    logout()
    onRedirect('#/auth?tab=login&reason=lms-only')
  }, [user, logout, onRedirect])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      if (hash.startsWith('#/auth')) return
      const returnPath = `#/${(currentPath || '').replace(/^\//, '')}`
      const toAuth = `#/auth?redirect=${encodeURIComponent(returnPath)}`
      onRedirect(toAuth)
      return
    }
    if (role && user.role !== role) {
      const dashboard = user.role === 'guru' ? '#/guru' : '#/student'
      onRedirect(dashboard)
    }
  }, [isAuthenticated, user, role, currentPath, onRedirect])

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Mengalihkan ke halaman masuk...</p>
      </div>
    )
  }
  if (role && user.role !== role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Mengalihkan...</p>
      </div>
    )
  }
  return <>{children}</>
}

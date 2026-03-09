import { useEffect } from 'react'
import { useAuthStore } from '../../store/auth'
import type { UserRole } from '../../types/auth'

interface AuthGuardProps {
  children: React.ReactNode
  role?: UserRole
  currentPath: string
  onRedirect: (path: string) => void
}

export function AuthGuard({ children, role, currentPath, onRedirect }: AuthGuardProps) {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())

  useEffect(() => {
    if (!isAuthenticated || !user) {
      const toAuth = `#/auth?redirect=${encodeURIComponent('#/' + (currentPath || '').replace(/^\//, ''))}`
      onRedirect(toAuth)
      return
    }
    if (role && user.role !== role) {
      const dashboard = user.role === 'instructor' ? '#/instructor' : '#/student'
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

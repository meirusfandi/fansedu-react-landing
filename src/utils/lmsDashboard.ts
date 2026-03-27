import type { AuthUser } from '../types/auth'

/** Hash route LMS untuk user yang sudah login. */
export function lmsDashboardHash(user: AuthUser | null | undefined): '#/student' | '#/guru' {
  if (user?.role === 'guru') return '#/guru'
  return '#/student'
}

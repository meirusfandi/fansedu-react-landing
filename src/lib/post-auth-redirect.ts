import type { UserRole } from '../types/auth'

const DASHBOARD: Record<UserRole, string> = {
  student: '#/student',
  guru: '#/guru',
}

function withLeadingHash(value: string): string {
  const t = value.trim()
  if (!t) return '#/'
  return t.startsWith('#') ? t : `#${t}`
}

/**
 * Setelah login/register: selalu ke dashboard role kecuali `redirect` menunjuk alur LMS
 * (checkout, area student/guru). Hindari `#/` dan halaman marketing yang bukan dashboard.
 */
export function resolvePostAuthHash(redirect: string | undefined | null, role: UserRole): string {
  const hash = withLeadingHash((redirect ?? '').trim() || '#/')
  const withoutHash = hash.startsWith('#') ? hash.slice(1) : hash
  const pathOnly = (withoutHash.split('?')[0] || '/').replace(/\/$/, '') || '/'

  if (pathOnly === '/' || pathOnly === '') {
    return DASHBOARD[role]
  }
  if (
    pathOnly.startsWith('/checkout') ||
    pathOnly.startsWith('/student') ||
    pathOnly.startsWith('/guru')
  ) {
    return hash
  }
  return DASHBOARD[role]
}

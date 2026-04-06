import type { UserRole } from '../types/auth'

export type AuthPasswordSetupHint = {
  mustSetPassword?: boolean
  nextAction?: string
  user?: { mustSetPassword?: boolean; must_set_password?: boolean }
}

function normalizedNextAction(raw: string | undefined | null): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
}

function userMustSetPassword(u: AuthPasswordSetupHint['user'] | null | undefined): boolean {
  return u != null && (u.mustSetPassword === true || u.must_set_password === true)
}

/** Respons login/register: perlu POST /auth/set-password sebelum akses penuh. */
export function authResponseRequiresPasswordSetup(res: AuthPasswordSetupHint): boolean {
  if (res.mustSetPassword === true) return true
  if (normalizedNextAction(res.nextAction) === 'SET_PASSWORD') return true
  return userMustSetPassword(res.user)
}

/** `#/student/profile` atau `#/guru/profile` */
export function profileHashForRole(role: UserRole): string {
  return role === 'guru' ? '#/guru/profile' : '#/student/profile'
}

/**
 * Query `password_setup_required=1` + `redirect` (hash tujuan, sudah encode).
 * Dipakai setelah login/register dan pada 403 `password_setup_required` dari API.
 */
export function hashWithPasswordSetupQuery(role: UserRole, redirectTargetHash: string): string {
  const base = profileHashForRole(role)
  return `${base}?password_setup_required=1&redirect=${encodeURIComponent(redirectTargetHash)}`
}

/** Hash profil + flag setup; `postAuthHash` = hasil `resolvePostAuthHash` (biasanya berawalan `#`). */
export function profileHashWithPasswordSetup(role: UserRole, postAuthHash: string): string {
  return hashWithPasswordSetupQuery(role, postAuthHash)
}

/** Apakah URL hash saat ini meminta alur setup password pertama. */
export function hashRequiresPasswordSetup(fullHash: string): boolean {
  const raw = fullHash.startsWith('#') ? fullHash.slice(1) : fullHash
  const qi = raw.indexOf('?')
  if (qi < 0) return false
  const q = new URLSearchParams(raw.slice(qi + 1))
  return q.get('password_setup_required') === '1'
}

function toAppHash(decoded: string): string {
  const t = decoded.trim()
  if (!t) return ''
  return t.startsWith('#') ? t : `#${t.replace(/^\//, '')}`
}

/** Setelah password pertama berhasil: ikuti `redirect` di query, atau `fallbackHash`. */
export function applyPasswordSetupRedirect(fallbackHash: string): void {
  const fb = fallbackHash.startsWith('#') ? fallbackHash : `#${fallbackHash}`
  const raw = window.location.hash.slice(1)
  const qi = raw.indexOf('?')
  const redirectTo = new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : '').get('redirect')

  if (!redirectTo) {
    window.location.hash = fb
    return
  }

  try {
    const next = toAppHash(decodeURIComponent(redirectTo))
    window.location.hash = next || fb
  } catch {
    window.location.hash = fb
  }
}

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

/** Hash router setelah login/register sukses. */
export function navigationHashAfterAuth(
  res: AuthPasswordSetupHint,
  role: UserRole,
  redirect: string,
): string {
  const next = resolvePostAuthHash(redirect, role)
  return authResponseRequiresPasswordSetup(res) ? profileHashWithPasswordSetup(role, next) : next
}

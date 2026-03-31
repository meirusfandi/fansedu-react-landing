/** Role di UI & Zustand — selalu `guru` atau `student` (bukan `instructor`). */
export type UserRole = 'student' | 'guru'

/** Portal ini hanya siswa & guru; admin/trainer harus memakai aplikasi lain. */
export class LmsPortalAccessDeniedError extends Error {
  override name = 'LmsPortalAccessDeniedError'
  constructor(
    message = 'Akun admin atau trainer tidak dapat mengakses portal ini. Gunakan aplikasi khusus admin/trainer.',
  ) {
    super(message)
  }
}

function normRoleToken(s: string): string {
  return s.trim().toLowerCase().replace(/-/g, '_')
}

/**
 * True jika kode / label peran mengindikasikan admin, trainer, atau peran staf lain
 * (bukan siswa / guru / instructor / pengajar).
 */
export function isForbiddenStaffPortalRoleSignal(raw: string | undefined): boolean {
  const s = raw ? normRoleToken(raw) : ''
  if (!s) return false

  const allowedExact = new Set([
    'student',
    'learner',
    'peserta',
    'siswa',
    'guru',
    'teacher',
    'user',
    'member',
  ])
  if (allowedExact.has(s)) return false

  const parts = s.split('_').filter(Boolean)
  if (parts.length > 0 && parts.every((p) => allowedExact.has(p))) return false

  const forbiddenSegment = new Set([
    'admin',
    'administrator',
    'trainer',
    'moderator',
    'instructor',
    'pengajar',
    'root',
    'owner',
    'superadmin',
    'superuser',
  ])
  if (parts.some((p) => forbiddenSegment.has(p))) return true
  if (parts.includes('admin') || parts.includes('administrator')) return true

  if (s === 'admin' || s === 'trainer' || s === 'moderator' || s === 'root' || s === 'owner') return true
  if (s === 'trainer' || s.endsWith('_trainer') || s.startsWith('trainer_')) return true

  return false
}

function forbiddenFromAuthSources(
  roleCode: string | undefined,
  displayRole: string | undefined,
  jwt: Record<string, unknown> | null,
): boolean {
  const signals: string[] = []
  if (roleCode) signals.push(roleCode)
  if (displayRole) signals.push(displayRole)
  if (jwt) {
    const jr = pickStr(jwt.role)
    const jc = pickStr(jwt.role_code) ?? pickStr(jwt.roleCode)
    if (jc) signals.push(jc)
    if (jr) signals.push(jr)
  }
  return signals.some((x) => isForbiddenStaffPortalRoleSignal(x))
}

export function assertAllowedOnLmsPortal(raw: RawApiUser, token?: string): void {
  const jwt = token ? decodeJwtPayload(token) : null
  const roleCodeRaw = pickStr(raw.role_code) ?? pickStr(raw.roleCode)
  const displayRole = pickStr(raw.role)
  if (forbiddenFromAuthSources(roleCodeRaw, displayRole, jwt)) {
    throw new LmsPortalAccessDeniedError()
  }
}

/** Payload user mentah dari API / register / login / me */
export interface RawApiUser {
  id: unknown
  name: unknown
  email: unknown
  /** Label tampilan API (bisa `instructor`); jangan dipakai mengalahkan `role_code`. */
  role?: unknown
  role_code?: unknown
  roleCode?: unknown
}

function pickStr(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

/** Decode JWT payload (tanpa verifikasi — hanya baca klaim seperti `role_code`). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = (4 - (b64.length % 4)) % 4
    const padded = b64 + '='.repeat(pad)
    const raw = atob(padded)
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

function mapRoleCodeToUserRole(code: string): UserRole | null {
  const c = code.trim().toLowerCase().replace(/-/g, '_')
  if (['student', 'learner', 'peserta', 'siswa'].includes(c)) return 'student'
  /** `trainer` bukan guru — akses portal ini dilarang di `assertAllowedOnLmsPortal`. */
  if (['guru', 'instructor', 'teacher', 'pengajar'].includes(c)) return 'guru'
  if (c.endsWith('_student')) return 'student'
  if (c.endsWith('_instructor') || c.endsWith('_guru')) return 'guru'
  return null
}

/**
 * Otorisasi: utamakan `role_code` / klaim JWT, lalu fallback `role` tampilan.
 * `instructor` di field `role` tetap dipetakan ke `guru` tanpa mengubah `roleCode` yang disimpan.
 */
export function normalizeAuthFields(
  displayRole: string | undefined,
  roleCode: string | undefined,
  jwt: Record<string, unknown> | null,
): UserRole {
  const codeFromJwt = jwt ? pickStr(jwt.role_code) ?? pickStr(jwt.roleCode) : undefined
  const effectiveCode = (roleCode && roleCode.trim()) || codeFromJwt
  if (effectiveCode) {
    const mapped = mapRoleCodeToUserRole(effectiveCode)
    if (mapped) return mapped
  }
  const dr = displayRole?.trim().toLowerCase()
  if (dr === 'guru' || dr === 'instructor' || dr === 'teacher' || dr === 'pengajar') return 'guru'
  if (dr === 'student') return 'student'
  if (jwt) {
    const jr = pickStr(jwt.role)?.toLowerCase()
    if (jr === 'guru' || jr === 'instructor' || jr === 'teacher' || jr === 'pengajar') return 'guru'
    if (jr === 'student') return 'student'
  }
  return 'student'
}

/** Normalisasi dari respons API + opsional token JWT. */
export function authUserFromApiResponse(raw: RawApiUser, token?: string): AuthUser {
  assertAllowedOnLmsPortal(raw, token)
  const jwt = token ? decodeJwtPayload(token) : null
  const id = String(raw.id ?? '')
  const name = String(raw.name ?? '')
  const email = String(raw.email ?? '')
  const roleCodeRaw = pickStr(raw.role_code) ?? pickStr(raw.roleCode)
  const displayRole = pickStr(raw.role)
  const role = normalizeAuthFields(displayRole, roleCodeRaw, jwt)
  const roleCodeStored =
    roleCodeRaw ?? (jwt ? pickStr(jwt.role_code) ?? pickStr(jwt.roleCode) : undefined)
  return {
    id,
    name,
    email,
    role,
    ...(roleCodeStored ? { roleCode: roleCodeStored } : {}),
  }
}

export function isGuruAuthRole(role: string | undefined): boolean {
  if (!role) return false
  const r = role.trim().toLowerCase()
  if (r === 'guru') return true
  if (r === 'instructor') return true
  return mapRoleCodeToUserRole(r) === 'guru'
}

/** Legacy: hanya string `role` tampilan (tanpa role_code). */
export function normalizeApiAuthRole(role: string): UserRole {
  return normalizeAuthFields(role, undefined, null)
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  /** Kode peran dari API/JWT (mis. STUDENT, INSTRUCTOR) — untuk otorisasi; tetap utuh walau `role` tampilan beda. */
  roleCode?: string
}

/** Sesi tersimpan: cegah admin/trainer jika `roleCode` / label masih ada di state. */
export function isAuthUserBlockedFromLmsPortal(user: Pick<AuthUser, 'role' | 'roleCode'>): boolean {
  return forbiddenFromAuthSources(user.roleCode, user.role, null)
}

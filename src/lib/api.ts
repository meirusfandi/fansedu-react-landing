/**
 * API client sesuai docs/API_REQUIREMENTS.md
 * Base URL: VITE_API_URL (default http://localhost:8080/api/v1)
 * Auth: Bearer token dari store (persist fansedu-auth)
 */

import { clearAuthOnUnauthorized, clearStoredAuthOnly } from './auth-clear'
import { recordApiClientFailure, recordHttpApiFailure } from './api-error-log'
import { API_BASE, PACKAGES_API_URL } from './api-config'
import type { Course } from '../types/course'
import { decodeJwtPayload, normalizeAuthFields } from '../types/auth'

function getStoredToken(): string | null {
  try {
    const raw = typeof window !== 'undefined'
      ? (localStorage.getItem('fansedu-auth') ?? sessionStorage.getItem('fansedu-auth'))
      : null
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: { token?: string } }
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

function authHeaders(): HeadersInit {
  const token = getStoredToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/** fetch + log error jaringan sebelum rethrow */
async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? 'GET').toString().toUpperCase()
  const urlStr =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : typeof Request !== 'undefined' && input instanceof Request
          ? input.url
          : String(input)
  try {
    return await globalThis.fetch(input, init)
  } catch (err) {
    recordApiClientFailure({
      kind: 'network',
      url: urlStr,
      method,
      message: err instanceof Error ? err.message : String(err),
      errorName: err instanceof Error ? err.name : 'Error',
    })
    throw err
  }
}

export class ApiError extends Error {
  status: number
  data?: { error?: string; message?: string }

  constructor(
    status: number,
    message: string,
    data?: { error?: string; message?: string }
  ) {
    super(message || data?.message || data?.error || `Error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/** Cek /auth/me: jangan biarkan UI menggantung jika server tidak jawab */
const AUTH_ME_TIMEOUT_MS = 6000

async function handleResponse<T>(
  res: Response,
  meta?: { method?: string; on401?: 'session-expired' | 'credentials' },
): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & Record<string, unknown>
  const method = meta?.method

  if (res.status === 401) {
    recordHttpApiFailure(res, data, { method, message: 'Tidak terotorisasi (401)' })
    const errBody = data as { message?: string; error?: string }
    const fromServer =
      (typeof errBody.message === 'string' && errBody.message.trim()) ||
      (typeof errBody.error === 'string' && errBody.error.trim()) ||
      ''

    if (meta?.on401 === 'credentials') {
      clearStoredAuthOnly()
      throw new ApiError(401, fromServer || 'Email atau kata sandi tidak valid.', errBody)
    }

    clearAuthOnUnauthorized()
    throw new ApiError(401, 'Sesi berakhir. Silakan masuk kembali.', {})
  }

  if (
    res.status === 403 &&
    typeof window !== 'undefined' &&
    ((data as { error?: string }).error === 'password_setup_required' ||
      (data as { code?: string }).code === 'password_setup_required')
  ) {
    const role = (() => {
      try {
        const raw = localStorage.getItem('fansedu-auth') ?? sessionStorage.getItem('fansedu-auth')
        if (!raw) return 'student'
        const parsed = JSON.parse(raw) as {
          state?: { user?: { role?: string; roleCode?: string }; token?: string | null }
        }
        const u = parsed?.state?.user
        const tok = parsed?.state?.token
        const jwt = typeof tok === 'string' && tok ? decodeJwtPayload(tok) : null
        return normalizeAuthFields(u?.role, u?.roleCode, jwt)
      } catch {
        return 'student'
      }
    })()
    const current = window.location.hash || '#/'
    const target = role === 'guru' ? '#/guru/profile' : '#/student/profile'
    window.location.hash = `${target}?password_setup_required=1&redirect=${encodeURIComponent(current)}`
  }

  if (!res.ok) {
    const errBody = data as unknown as { message?: string; error?: string }
    const msg =
      typeof errBody.message === 'string' ? errBody.message : res.statusText
    recordHttpApiFailure(res, data, { method, message: msg })
    throw new ApiError(res.status, msg, errBody)
  }
  return data as T
}

// --- Auth ---

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  /** Default student jika tidak dikirim — gunakan `guru` untuk akun guru (dipetakan ke slug dari GET /roles). */
  role?: 'student' | 'guru'
  /** Slug role persis dari GET /api/v1/roles; jika diisi, mengalahkan `role`. */
  roleSlug?: string
  /** Slug program/paket — opsional; kirim jika daftar terkait program tertentu. */
  slug?: string
  /** Alias lama untuk `slug` (nilai yang sama dikirim sebagai `programSlug` ke API). */
  program_slug?: string
}

export interface RoleListItem {
  slug: string
  name?: string
  code?: string
  id?: string
}

function parseRolesResponse(raw: unknown): RoleListItem[] {
  if (raw == null) return []
  const root = raw as Record<string, unknown>
  const nested = root.data && typeof root.data === 'object' && !Array.isArray(root.data)
    ? (root.data as Record<string, unknown>)
    : null
  const arr: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray(root.data)
      ? root.data
      : nested && Array.isArray(nested.items)
        ? nested.items
        : Array.isArray(root.roles)
          ? root.roles
          : Array.isArray(root.items)
            ? root.items
            : []
  const out: RoleListItem[] = []
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const slugRaw = o.slug ?? o.role_slug ?? o.code
    if (typeof slugRaw !== 'string' || !slugRaw.trim()) continue
    out.push({
      slug: slugRaw.trim(),
      id: typeof o.id === 'string' ? o.id : undefined,
      name: typeof o.name === 'string' ? o.name : typeof o.label === 'string' ? o.label : undefined,
      code: typeof o.code === 'string' ? o.code : undefined,
    })
  }
  return out
}

const ROLES_CACHE_MS = 5 * 60_000
let rolesMemoryCache: { items: RoleListItem[]; fetchedAt: number } | null = null
let rolesInFlight: Promise<RoleListItem[]> | null = null

/**
 * Daftar role dari backend (slug untuk POST /auth/register).
 * Tanpa header Authorization agar bisa dipakai sebelum login.
 */
export async function apiGetRoles(options?: { force?: boolean }): Promise<RoleListItem[]> {
  const force = options?.force === true
  if (!force && rolesMemoryCache && Date.now() - rolesMemoryCache.fetchedAt < ROLES_CACHE_MS) {
    return rolesMemoryCache.items
  }
  if (!force && rolesInFlight) return rolesInFlight

  rolesInFlight = (async () => {
    try {
      const res = await apiFetch(`${API_BASE}/roles`, {
        headers: { 'Content-Type': 'application/json' },
      })
      /** Jangan pakai handleResponse: 401 di sini tidak boleh memicu clear sesi (daftar sebagai guest). */
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        recordHttpApiFailure(res, data, { method: 'GET' })
        throw new ApiError(
          res.status,
          (data as { message?: string }).message || res.statusText,
          data as { error?: string; message?: string },
        )
      }
      const raw = await res.json().catch(() => null)
      const items = parseRolesResponse(raw)
      rolesMemoryCache = { items, fetchedAt: Date.now() }
      return items
    } finally {
      rolesInFlight = null
    }
  })()

  return rolesInFlight
}

export function invalidateRolesCache(): void {
  rolesMemoryCache = null
  rolesInFlight = null
}

function resolveRoleSlugForRegister(uiRole: 'student' | 'guru', roles: RoleListItem[]): string {
  if (roles.length === 0) {
    return uiRole === 'guru' ? 'guru' : 'student'
  }
  const norm = (s: string) => s.trim().toLowerCase().replace(/-/g, '_')
  const slugMatches = (raw: string, target: 'student' | 'guru'): boolean => {
    const s = norm(raw)
    if (target === 'student') {
      return (
        s === 'student' ||
        s === 'siswa' ||
        s === 'learner' ||
        s === 'peserta' ||
        s.endsWith('_student')
      )
    }
    return (
      s === 'guru' ||
      s === 'instructor' ||
      s === 'teacher' ||
      s === 'trainer' ||
      s === 'pengajar' ||
      s.endsWith('_guru') ||
      s.endsWith('_instructor')
    )
  }
  for (const r of roles) {
    if (slugMatches(r.slug, uiRole)) return r.slug
  }
  for (const r of roles) {
    const c = r.code ?? ''
    if (c && slugMatches(c, uiRole)) return r.slug
  }
  for (const r of roles) {
    const n = norm(r.name ?? '')
    if (uiRole === 'student' && (n.includes('siswa') || n.includes('student') || n.includes('peserta')))
      return r.slug
    if (uiRole === 'guru' && (n.includes('guru') || n.includes('instructor') || n.includes('pengajar')))
      return r.slug
  }
  const exact = roles.find((r) => norm(r.slug) === uiRole)
  if (exact) return exact.slug
  return uiRole === 'guru' ? 'guru' : 'student'
}

export interface AuthResponseUser {
  id: string
  name: string
  email: string
  role?: string
  role_code?: string
  roleCode?: string
}

export interface AuthResponse {
  user: AuthResponseUser
  token: string
}

export interface MeResponse {
  id: string
  name: string
  email: string
  role?: string
  role_code?: string
  roleCode?: string
}

export async function apiLogin(body: LoginRequest): Promise<AuthResponse> {
  const res = await apiFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<AuthResponse>(res, { on401: 'credentials' })
}

export async function apiRegister(body: RegisterRequest): Promise<AuthResponse> {
  const slugVal = (body.slug ?? body.program_slug)?.trim()
  const payload: Record<string, unknown> = {
    name: body.name,
    email: body.email,
    password: body.password,
  }
  const explicitRoleSlug = body.roleSlug?.trim()
  if (explicitRoleSlug) {
    payload.role = explicitRoleSlug
  } else if (body.role) {
    const roles = await apiGetRoles()
    payload.role = resolveRoleSlugForRegister(body.role, roles)
  }
  if (slugVal) {
    payload.slug = slugVal
    payload.programSlug = slugVal
  }
  const res = await apiFetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<AuthResponse>(res, { on401: 'credentials' })
}

export async function apiLogout(): Promise<void> {
  const res = await apiFetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (res.status === 401) return
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    recordHttpApiFailure(res, data, { method: 'POST' })
  }
}

export async function apiGetMe(): Promise<MeResponse> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), AUTH_ME_TIMEOUT_MS)
  try {
    const res = await apiFetch(`${API_BASE}/auth/me`, {
      headers: authHeaders(),
      signal: controller.signal,
    })
    return await handleResponse<MeResponse>(res)
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      clearAuthOnUnauthorized()
      throw new ApiError(408, 'Validasi sesi memakan waktu terlalu lama.', {})
    }
    throw e
  } finally {
    window.clearTimeout(timeoutId)
  }
}

// --- Packages (GET /packages — katalog & detail program) ---

export interface PackageItem {
  id: string
  name: string
  slug: string
  shortDescription: string | null
  /** Harga efektif (rupiah integer) */
  price: number
  /** Harga early bird & normal (rupiah integer) */
  priceEarlyBird?: number | null
  priceNormal?: number | null
  ctaUrl: string | null
  ctaLabel: string
  isOpen: boolean
  durasi?: string | null
  materi?: string[]
  fasilitas?: string[]
  bonus?: string[]
  isBundle?: boolean
  bundleSubtitle?: string | null
  waMessageTemplate?: string | null
}

function parsePackagesResponse(data: unknown): PackageItem[] {
  let arr: unknown[] | null = null
  if (Array.isArray(data)) arr = data
  else if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    if (Array.isArray(o.data)) arr = o.data
    else if (Array.isArray(o.packages)) arr = o.packages
    else if (Array.isArray(o.result)) arr = o.result
    else if (Array.isArray(o.items)) arr = o.items
  }
  if (!Array.isArray(arr) || arr.length === 0) return []
  const get = (p: Record<string, unknown>, snake: string, camel?: string) => p[snake] ?? (camel ? p[camel] : undefined)
  const waNum = '6285121277161'
  const waUrl = (msg: string) => `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`
  const parseArr = (v: unknown): string[] | undefined => {
    if (Array.isArray(v)) return v as string[]
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v) as unknown
        return Array.isArray(parsed) ? parsed : undefined
      } catch { return undefined }
    }
    return undefined
  }
  const num = (v: unknown): number | null => {
    if (typeof v === 'number' && !Number.isNaN(v)) return v
    const n = typeof v === 'string' ? parseInt(v, 10) : Number(v)
    return typeof n === 'number' && !Number.isNaN(n) ? n : null
  }
  const asRupiahInt = (v: unknown): number | null => {
    const n = num(v)
    return n != null && n > 0 ? Math.trunc(n) : null
  }
  const pickPositive = (...vals: Array<number | null | undefined>): number => {
    for (const v of vals) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.trunc(v)
    }
    return 0
  }
  const arrFiltered = (arr as Record<string, unknown>[]).filter((p) => get(p, 'is_open', 'isOpen') !== false)
  return arrFiltered
    .map((p) => {
      const waTemplate = get(p, 'wa_message_template', 'waMessageTemplate')
      const ctaUrlVal = get(p, 'cta_url', 'ctaUrl')
      const priceNum = asRupiahInt(get(p, 'price', 'amount'))
      const totalPriceNum = asRupiahInt(get(p, 'total_price', 'totalPrice'))
      const finalPriceNum = asRupiahInt(get(p, 'final_price', 'finalPrice'))
      const priceAmountNum = asRupiahInt(get(p, 'price_amount', 'priceAmount'))
      const priceEarlyNum = asRupiahInt(get(p, 'price_early_bird', 'priceEarlyBird'))
      const priceNormalNum = asRupiahInt(get(p, 'price_normal', 'priceNormal'))
      // Penting: jangan pakai ?? untuk harga karena nilai 0 bisa "mengunci" fallback.
      // Ambil harga positif pertama yang tersedia.
      const amountRupiah = pickPositive(priceNum, totalPriceNum, finalPriceNum, priceAmountNum, priceEarlyNum, priceNormalNum)
      return {
        id: String(p.id ?? ''),
        name: String(get(p, 'name', 'title') ?? ''),
        slug: String(get(p, 'slug') ?? ''),
        shortDescription: get(p, 'short_description', 'shortDescription') != null ? String(get(p, 'short_description', 'shortDescription')) : null,
        price: amountRupiah,
        priceEarlyBird: priceEarlyNum,
        priceNormal: priceNormalNum,
        ctaUrl: waTemplate ? waUrl(String(waTemplate)) : (ctaUrlVal != null ? String(ctaUrlVal) : null),
        ctaLabel: String(get(p, 'cta_label', 'ctaLabel') ?? 'Daftar'),
        isOpen: get(p, 'is_open', 'isOpen') !== false,
        durasi: get(p, 'durasi', 'duration') != null ? String(get(p, 'durasi', 'duration')) : null,
        materi: parseArr(get(p, 'materi')) ?? undefined,
        fasilitas: parseArr(get(p, 'fasilitas')) ?? undefined,
        bonus: parseArr(get(p, 'bonus')) ?? undefined,
        isBundle: get(p, 'is_bundle', 'isBundle') === true,
        bundleSubtitle: get(p, 'bundle_subtitle', 'bundleSubtitle') != null ? String(get(p, 'bundle_subtitle', 'bundleSubtitle')) : null,
        waMessageTemplate: waTemplate != null ? String(waTemplate) : null,
      }
    })
}

/** Dedupe request concurrent + cache memori (getPackageBySlug memakai daftar yang sama). */
const PACKAGES_CACHE_MS = 120_000
let packagesMemoryCache: { list: PackageItem[]; fetchedAt: number } | null = null
let packagesInFlight: Promise<PackageItem[]> | null = null

export async function getPackages(options?: { force?: boolean }): Promise<PackageItem[]> {
  const force = options?.force === true

  if (!force && packagesMemoryCache) {
    if (Date.now() - packagesMemoryCache.fetchedAt < PACKAGES_CACHE_MS) {
      return packagesMemoryCache.list
    }
  }

  if (!force && packagesInFlight) return packagesInFlight

  packagesInFlight = (async () => {
    try {
      const res = await apiFetch(PACKAGES_API_URL, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        recordHttpApiFailure(res, errBody, { method: 'GET' })
        throw new ApiError(res.status, res.statusText)
      }
      const data = await res.json().catch(() => null)
      const list = parsePackagesResponse(data)
      packagesMemoryCache = { list, fetchedAt: Date.now() }
      return list
    } finally {
      packagesInFlight = null
    }
  })()

  return packagesInFlight
}

/** Hapus cache paket (mis. setelah admin mengubah harga di backend). */
export function invalidatePackagesCache(): void {
  packagesMemoryCache = null
  packagesInFlight = null
}

export async function getPackageBySlug(slug: string): Promise<PackageItem | null> {
  const list = await getPackages()
  return list.find((p) => p.slug === slug) ?? null
}

/** Map PackageItem (dari GET /packages) ke Course untuk Katalog & Detail program */
export function packageToCourse(pkg: PackageItem): Course {
  return {
    id: pkg.id,
    slug: pkg.slug,
    title: pkg.name,
    shortDescription: pkg.shortDescription ?? '',
    thumbnail: '',
    price: pkg.price,
    priceEarlyBird: pkg.priceEarlyBird ?? undefined,
    priceNormal: pkg.priceNormal ?? undefined,
    instructor: { id: '', name: 'Fansedu' },
    category: pkg.isBundle ? 'Bundle' : 'Program',
    level: 'beginner',
    duration: pkg.durasi ?? '',
    modules: pkg.materi?.length
      ? [{ id: 'materi', title: 'Materi', lessons: pkg.materi.map((m, i) => ({ id: `m-${i}`, title: m, duration: '' })) }]
      : undefined,
  }
}

// --- Programs (legacy; prefer getPackages / getPackageBySlug) ---

export interface ProgramListItem {
  id: string
  slug: string
  title: string
  shortDescription: string
  thumbnail: string
  price: number
  priceDisplay: string
  instructor: { id: string; name: string; avatar?: string }
  category: string
  level: string
  duration: string
  rating?: number
  reviewCount?: number
}

export interface ProgramsResponse {
  data: ProgramListItem[]
  total: number
  page: number
  totalPages: number
}

export interface ProgramDetailResponse extends ProgramListItem {
  description?: string
  modules?: { id: string; title: string; lessons: { id: string; title: string; duration: string }[] }[]
  reviews?: { id: string; user: string; rating: number; comment: string; date: string }[]
}

export async function getPrograms(params?: {
  category?: string
  search?: string
  page?: number
  limit?: number
}): Promise<ProgramsResponse> {
  const q = new URLSearchParams()
  if (params?.category) q.set('category', params.category)
  if (params?.search) q.set('search', params.search)
  if (params?.page != null) q.set('page', String(params.page))
  if (params?.limit != null) q.set('limit', String(params.limit))
  const res = await apiFetch(`${API_BASE}/programs?${q.toString()}`, { headers: authHeaders() })
  return handleResponse<ProgramsResponse>(res)
}

export async function getProgramBySlug(slug: string): Promise<ProgramDetailResponse | null> {
  const res = await apiFetch(`${API_BASE}/programs/${encodeURIComponent(slug)}`, { headers: authHeaders() })
  if (res.status === 404) return null
  return handleResponse<ProgramDetailResponse>(res)
}

// --- Checkout ---

export interface CheckoutInitiateRequest {
  programSlug?: string
  programId?: string
  name: string
  email: string
  /** Id user yang login; jika ada, backend gunakan untuk cek order pending yang sama */
  userId?: string
  /** Kode promo (opsional) — BE juga terima di initiate */
  promoCode?: string
  /** Harga yang diharapkan (dari packages), rupiah integer */
  expectedTotal?: number
  /** Harga normal program, rupiah integer */
  normalPrice?: number
  /** Role pembeli untuk flow kolektif (mis. guru) */
  buyerRole?: 'student' | 'guru'
  /** Hint role untuk backend normalisasi flow */
  roleHint?: 'student' | 'guru'
  /** Jumlah item pembelian (mis. jumlah siswa pada pembelian kolektif) */
  quantity?: number
  /** Daftar siswa yang dibelikan kelas oleh guru */
  students?: Array<{
    name: string
    email: string
    userId?: string
  }>
}

/** Response 201 POST /checkout/initiate */
export interface CheckoutInitiateResponse {
  checkoutId: string
  orderId: string
  total: number
  program?: { title: string; priceDisplay: string }
  /** Kode unik 3 digit untuk verifikasi */
  confirmationCode?: number
  normalPrice?: number
  finalPrice?: number
  discountPercent?: number
  priceDisplay?: string
}

/** Body POST /checkout/payment-session */
export interface PaymentSessionRequest {
  /** orderId dari response initiate — key utama di BE */
  orderId: string
  /** checkoutId (alias, beberapa BE pakai ini) */
  checkoutId?: string
  paymentMethod: 'bank_transfer' | 'virtual_account' | 'ewallet'
  promoCode?: string
  /** Kode unik 3 digit (100–999) */
  uniqueCode?: number
  /** Jumlah yang harus dibayar (termasuk kode unik) */
  amount?: number
}

export interface PaymentSessionResponse {
  paymentUrl?: string
  orderId: string
  expiry?: string
  virtualAccountNumber?: string
  amount: number
}

export async function initiateCheckout(payload: CheckoutInitiateRequest): Promise<CheckoutInitiateResponse> {
  const body: Record<string, unknown> = {
    programSlug: payload.programSlug,
    programId: payload.programId,
    name: payload.name,
    email: payload.email,
    promoCode: payload.promoCode ?? '',
  }

  if (payload.buyerRole) body.buyerRole = payload.buyerRole
  if (payload.roleHint) body.roleHint = payload.roleHint

  if (payload.quantity != null && payload.quantity > 0) {
    const qty = Math.max(1, Math.trunc(payload.quantity))
    body.quantity = qty
    body.itemCount = qty
  }

  if (Array.isArray(payload.students) && payload.students.length > 0) {
    const normalizedStudents = payload.students
      .map((student) => ({
        name: String(student.name ?? '').trim(),
        email: String(student.email ?? '').trim(),
        userId: student.userId ? String(student.userId).trim() : undefined,
      }))
      .filter((student) => student.name && student.email)
    if (normalizedStudents.length > 0) body.students = normalizedStudents
  }

  if (payload.userId) body.userId = payload.userId

  const totalRupiah = payload.expectedTotal != null && payload.expectedTotal > 0 ? payload.expectedTotal : 0
  if (totalRupiah > 0) {
    body.expectedTotal = totalRupiah
    body.total = totalRupiah
    body.amount = totalRupiah
    body.price = totalRupiah
    body.finalPrice = totalRupiah
  }

  if (payload.normalPrice != null && payload.normalPrice > 0) {
    body.normalPrice = payload.normalPrice
  }

  const res = await apiFetch(`${API_BASE}/checkout/initiate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  const data = await handleResponse<CheckoutInitiateResponse & { confirmation_code?: string | number }>(res)

  // Parse confirmation code (bisa string atau number dari backend) -> paksa integer
  const rawConfCode = data.confirmationCode ?? (data as { confirmation_code?: string | number }).confirmation_code
  const confAsNumber = rawConfCode != null ? Number(rawConfCode) : NaN
  const confirmationCode = Number.isFinite(confAsNumber) ? Math.trunc(confAsNumber) : undefined

  // Parse total — backend bisa mengembalikan 0, override dengan expectedTotal
  let totalNum = typeof data.total === 'number' && !Number.isNaN(data.total) ? data.total : 0
  const finalPriceRaw = (data as { finalPrice?: number }).finalPrice
  let finalPriceNum = typeof finalPriceRaw === 'number' && finalPriceRaw > 0 ? finalPriceRaw : totalNum
  const normalPriceRaw = (data as { normalPrice?: number }).normalPrice
  let normalPriceOut = typeof normalPriceRaw === 'number' && normalPriceRaw > 0 ? normalPriceRaw : undefined
  let priceDisplayOut = data.priceDisplay ?? data.program?.priceDisplay

  const backendReturnedZero = totalNum === 0 || Number.isNaN(totalNum)
  if (backendReturnedZero && payload.expectedTotal != null && payload.expectedTotal > 0) {
    totalNum = payload.expectedTotal
    finalPriceNum = payload.expectedTotal
    priceDisplayOut = `Rp${payload.expectedTotal.toLocaleString('id-ID')}`
  }

  if ((normalPriceOut == null || normalPriceOut === 0) && payload.normalPrice != null && payload.normalPrice > 0) {
    normalPriceOut = payload.normalPrice
  }

  return {
    ...data,
    total: Number.isNaN(totalNum) ? 0 : totalNum,
    finalPrice: Number.isNaN(finalPriceNum) ? 0 : finalPriceNum,
    normalPrice: normalPriceOut,
    priceDisplay: priceDisplayOut,
    program: data.program
      ? { ...data.program, priceDisplay: priceDisplayOut || data.program.priceDisplay }
      : data.program,
    confirmationCode: (confirmationCode != null && !Number.isNaN(confirmationCode)) ? confirmationCode : undefined,
  }
}

export async function createPaymentSession(payload: PaymentSessionRequest): Promise<PaymentSessionResponse> {
  const body: Record<string, unknown> = {
    orderId: payload.orderId,
    paymentMethod: payload.paymentMethod,
    promoCode: payload.promoCode ?? '',
  }
  if (payload.checkoutId) body.checkoutId = payload.checkoutId
  if (payload.uniqueCode != null && payload.uniqueCode >= 100 && payload.uniqueCode <= 999) {
    body.uniqueCode = payload.uniqueCode
  }
  const amountNum = payload.amount != null && !Number.isNaN(Number(payload.amount)) ? Number(payload.amount) : 0
  if (amountNum > 0) {
    body.amount = amountNum
    body.total = amountNum
  }
  const res = await apiFetch(`${API_BASE}/checkout/payment-session`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<PaymentSessionResponse>(res)
}


/** Upload bukti pembayaran + data pengirim. Backend menyimpan ke transaksi (status tetap pending / menunggu verifikasi). */
export async function submitPaymentProof(orderId: string, form: FormData): Promise<void> {
  const h = authHeaders() as Record<string, string>
  const { 'Content-Type': _ct, ...rest } = h
  const res = await apiFetch(`${API_BASE}/checkout/orders/${encodeURIComponent(orderId)}/payment-proof`, {
    method: 'POST',
    headers: { ...rest, Accept: 'application/json' },
    body: form,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    recordHttpApiFailure(res, data, { method: 'POST' })
    throw new ApiError(res.status, (data as { message?: string }).message || res.statusText, data as { error?: string; message?: string })
  }
}

// --- Auth: Register with Invite Token (checkout guest → create account) ---

export interface RegisterWithInviteRequest {
  token: string
  email: string
  name: string
  password: string
}

export async function registerWithInvite(body: RegisterWithInviteRequest): Promise<AuthResponse> {
  const res = await apiFetch(`${API_BASE}/auth/register-with-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<AuthResponse>(res, { on401: 'credentials' })
}

// --- Student ---

/** Response GET /student/dashboard — ringkasan untuk halaman dashboard siswa */
export interface StudentDashboardResponse {
  coursesCount?: number
  recentCourses?: MyCourseItem[]
  tryoutSummary?: {
    attemptedCount?: number
    completedCount?: number
    registeredCount?: number
    averageScore?: number
    bestScore?: number
    upcomingCount?: number
    streakDays?: number
    lastAttemptAt?: string
  }
  weeklyTarget?: {
    targetLessons?: number
    targetTryouts?: number
    completedLessons?: number
    completedTryouts?: number
  }
  badges?: Array<{ id: string; label: string; description?: string; earnedAt?: string }>
  [key: string]: unknown
}

export interface MyCourseItem {
  id: string
  program: { id: string; slug: string; title: string; thumbnail?: string }
  progressPercent: number
  enrolledAt: string
  lastAccessedAt?: string
}

export interface StudentCoursesResponse {
  data: MyCourseItem[]
  total?: number
  page?: number
  totalPages?: number
}

export interface StudentCoursesQuery {
  page?: number
  limit?: number
  search?: string
  progressStatus?: 'all' | 'in-progress' | 'completed'
}

export interface OpenTryoutItem {
  id: string
  title: string
  shortTitle?: string
  description?: string
  startAt: string
  intervalDays: number
  /** Batas pendaftaran (ISO), opsional */
  registrationDeadlineAt?: string
  /** Akhir periode tryout di sisi siswa (ISO) — setelah ini tidak bisa daftar/mulai; leaderboard tetap untuk yang sudah attempt */
  closeAt?: string
  badge?: string
  isRegistered?: boolean
  hasAttempted?: boolean
  canRetake?: boolean
  detailPath: string
}

export interface TryoutStartResponse {
  attemptId?: string
  examUrl?: string
  startedAt?: string
  [key: string]: unknown
}

export interface StudentTryoutStatusResponse {
  isRegistered: boolean
  hasAttempted: boolean
  canRetake: boolean
  attemptCount?: number
  lastAttemptId?: string
}

export interface TryoutLeaderboardEntry {
  rank: number
  userId: string
  userName: string
  schoolName: string
  hasAttempt: boolean
  /** Skor terbaik dari API (`bestScore` / `best_score` / `score`); 0 jika belum mengerjakan. */
  score: number
}

function toIntSafe(v: unknown, fallback = 14): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(1, Math.trunc(v))
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v)
    if (Number.isFinite(n)) return Math.max(1, Math.trunc(n))
  }
  return fallback
}

function extractTryoutListArray(raw: unknown): Record<string, unknown>[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw as Record<string, unknown>[]
  if (typeof raw !== 'object') return []
  const root = raw as Record<string, unknown>
  const nestedData =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null
  const candidates: unknown[] = [
    root.data,
    root.tryouts,
    root.items,
    root.results,
    root.content,
    root.rows,
    nestedData?.tryouts,
    nestedData?.items,
    nestedData?.data,
    nestedData?.rows,
  ]
  for (const c of candidates) {
    if (Array.isArray(c)) return c as Record<string, unknown>[]
  }
  return []
}

function parseOpenTryoutsResponse(raw: unknown): OpenTryoutItem[] {
  const listRaw = extractTryoutListArray(raw)

  return listRaw
    .filter((item) => (item.is_open ?? item.isOpen ?? true) !== false)
    .map((item) => {
      const id = String(
        item.id ??
          item.tryout_id ??
          item.tryoutId ??
          item.uuid ??
          item.slug ??
          '',
      ).trim()
      const title = String(item.title ?? item.name ?? 'Tryout')
      const shortTitleRaw = item.shortTitle ?? item.short_title
      const descriptionRaw = item.description ?? item.desc
      const startAt = String(
        item.startAt ??
        item.start_at ??
        item.startsAt ??
        item.starts_at ??
        item.startDate ??
        item.start_date ??
        item.schedule_at ??
        item.scheduledAt ??
        item.scheduled_at ??
        item.opens_at ??
        item.opensAt ??
        item.open_at ??
        item.openAt ??
        item.begin_at ??
        item.beginAt ??
        item.window_start ??
        item.windowStart ??
        ''
      ).trim()
      const intervalDays = toIntSafe(item.intervalDays ?? item.interval_days, 14)
      const registrationDeadlineAtRaw =
        item.registrationDeadlineAt ??
        item.registration_deadline_at ??
        item.register_until ??
        item.registration_ends_at ??
        item.deadline_at

      const closeAtRaw =
        item.closeAt ??
        item.close_at ??
        item.closes_at ??
        item.closesAt ??
        item.end_at ??
        item.ends_at ??
        item.endAt ??
        item.exam_end_at ??
        item.tryout_end_at ??
        item.window_end ??
        item.windowEnd

      const badgeRaw = item.badge ?? item.label ?? item.tag
      const badgeStr =
        typeof badgeRaw === 'string' && badgeRaw.trim()
          ? badgeRaw.trim()
          : badgeRaw === true
            ? 'Gratis'
            : typeof badgeRaw === 'number'
              ? String(badgeRaw)
              : 'Gratis'

      return {
        id,
        title,
        shortTitle: shortTitleRaw ? String(shortTitleRaw) : undefined,
        description: descriptionRaw ? String(descriptionRaw) : undefined,
        startAt,
        intervalDays,
        registrationDeadlineAt: registrationDeadlineAtRaw ? String(registrationDeadlineAtRaw) : undefined,
        closeAt: closeAtRaw ? String(closeAtRaw).trim() : undefined,
        badge: badgeStr,
        isRegistered: Boolean(
          item.isRegistered ??
          item.is_registered ??
          item.registered ??
          item.has_registered
        ),
        hasAttempted: Boolean(
          item.hasAttempted ??
          item.has_attempted ??
          item.hasAttempt ??
          item.has_attempt ??
          item.isCompleted ??
          item.is_completed ??
          item.completed
        ),
        canRetake: Boolean(
          item.canRetake ??
          item.can_retake ??
          item.allowRetake ??
          item.allow_retake
        ),
        detailPath: `#/tryout-info/${encodeURIComponent(id)}`,
      } satisfies OpenTryoutItem
    })
    /** Cukup id yang valid; startAt opsional dari sisi API — jadwal ditangani di UI */
    .filter((item) => Boolean(item.id))
}

/** GET /tryouts?status=open — daftar tryout dari database/backend */
export async function getOpenTryouts(): Promise<OpenTryoutItem[]> {
  const res = await apiFetch(`${API_BASE}/tryouts?status=open`, { headers: authHeaders() })
  const data = await handleResponse<unknown>(res)
  return parseOpenTryoutsResponse(data)
}

/** POST /student/tryouts/:id/register */
export async function registerStudentTryout(tryoutId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/student/tryouts/${encodeURIComponent(tryoutId)}/register`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return handleResponse<void>(res)
}

/** POST /student/tryouts/:id/start */
export async function startStudentTryout(tryoutId: string): Promise<TryoutStartResponse> {
  const res = await apiFetch(`${API_BASE}/student/tryouts/${encodeURIComponent(tryoutId)}/start`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return handleResponse<TryoutStartResponse>(res)
}

/**
 * GET /student/tryouts/:id/status
 * Optional endpoint (frontend akan fallback jika 404).
 */
export async function getStudentTryoutStatus(tryoutId: string): Promise<StudentTryoutStatusResponse | null> {
  const disabledKey = 'student-tryout-status-endpoint-disabled'
  if (typeof window !== 'undefined' && sessionStorage.getItem(disabledKey) === '1') {
    return null
  }
  const res = await apiFetch(`${API_BASE}/student/tryouts/${encodeURIComponent(tryoutId)}/status`, {
    headers: authHeaders(),
  })
  if (res.status === 404) {
    if (typeof window !== 'undefined') sessionStorage.setItem(disabledKey, '1')
    return null
  }
  const data = await handleResponse<Record<string, unknown>>(res)

  const toBool = (value: unknown): boolean =>
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true'

  const isRegistered = toBool(
    data.isRegistered ??
    data.is_registered ??
    data.registered ??
    data.has_registered
  )
  const hasAttempted = toBool(
    data.hasAttempted ??
    data.has_attempted ??
    data.hasAttempt ??
    data.has_attempt ??
    data.isCompleted ??
    data.is_completed ??
    data.completed
  )
  const canRetake = toBool(
    data.canRetake ??
    data.can_retake ??
    data.allowRetake ??
    data.allow_retake
  )
  const attemptCountRaw = data.attemptCount ?? data.attempt_count
  const attemptCountNum = typeof attemptCountRaw === 'number'
    ? Math.trunc(attemptCountRaw)
    : (typeof attemptCountRaw === 'string' && attemptCountRaw.trim() ? Math.trunc(Number(attemptCountRaw)) : undefined)

  return {
    isRegistered,
    hasAttempted,
    canRetake,
    attemptCount: Number.isFinite(attemptCountNum as number) ? (attemptCountNum as number) : undefined,
    lastAttemptId: typeof data.lastAttemptId === 'string'
      ? data.lastAttemptId
      : (typeof data.last_attempt_id === 'string' ? data.last_attempt_id : undefined),
  }
}

function extractTryoutLeaderboardRows(raw: unknown): Record<string, unknown>[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw as Record<string, unknown>[]
  if (typeof raw !== 'object') return []
  const o = raw as Record<string, unknown>
  const pick = (v: unknown): Record<string, unknown>[] | null =>
    Array.isArray(v) ? (v as Record<string, unknown>[]) : null
  let rows = pick(o.leaderboard)
  if (rows) return rows
  rows = pick(o.entries) ?? pick(o.items) ?? pick(o.results)
  if (rows) return rows
  const d = o.data
  if (Array.isArray(d)) return d as Record<string, unknown>[]
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    const inner = d as Record<string, unknown>
    rows =
      pick(inner.leaderboard) ??
      pick(inner.entries) ??
      pick(inner.items) ??
      pick(inner.results) ??
      pick(inner.data)
    if (rows) return rows
  }
  return []
}

function parseLeaderboardRowScore(row: Record<string, unknown>): number | undefined {
  const raw =
    row.bestScore ??
    row.best_score ??
    row.score ??
    row.totalScore ??
    row.total_score ??
    row.points ??
    row.nilai ??
    row.highestScore ??
    row.highest_score
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw)
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw)
    if (Number.isFinite(n)) return Math.trunc(n)
  }
  return undefined
}

export async function getTryoutLeaderboard(tryoutId: string): Promise<TryoutLeaderboardEntry[]> {
  const res = await apiFetch(`${API_BASE}/tryouts/${encodeURIComponent(tryoutId)}/leaderboard`, {
    headers: authHeaders(),
  })
  const data = await handleResponse<unknown>(res)
  const rowsRaw = extractTryoutLeaderboardRows(data)

  return rowsRaw.map((row, index) => {
    const rankRaw = row.rank
    const rankNum = typeof rankRaw === 'number'
      ? Math.trunc(rankRaw)
      : (typeof rankRaw === 'string' && rankRaw.trim() ? Math.trunc(Number(rankRaw)) : index + 1)
    const hasAttempt = Boolean(
      row.has_attempt ??
        row.hasAttempt ??
        row.has_attempted ??
        row.hasAttempted,
    )
    const parsed = parseLeaderboardRowScore(row)
    const score = parsed !== undefined ? parsed : 0

    return {
      rank: Number.isFinite(rankNum) ? rankNum : index + 1,
      userId: String(row.user_id ?? row.userId ?? ''),
      userName: String(row.user_name ?? row.userName ?? '—'),
      schoolName: String(row.school_name ?? row.schoolName ?? '—'),
      hasAttempt,
      score,
    } satisfies TryoutLeaderboardEntry
  })
}

export interface TransactionItem {
  id: string
  orderId: string
  status: string
  total: number
  quantity?: number
  unitPrice?: number
  subtotal?: number
  uniqueCode?: number
  isCollective?: boolean
  students?: Array<{ userId?: string; name?: string; email?: string }>
  finalPrice?: number
  confirmationCode?: number
  programs: { title: string }[]
  paidAt: string
}

export interface StudentTransactionsResponse {
  data: TransactionItem[]
  total?: number
  page?: number
  totalPages?: number
}

export interface StudentTransactionsQuery {
  page?: number
  limit?: number
  search?: string
  status?: 'all' | 'pending' | 'paid'
}

export interface StudentTryoutHistoryItem {
  tryoutId: string
  tryoutTitle: string
  attemptId?: string
  score: number
  submittedAt: string
  improvementFromPrevious?: number
}

export interface StudentTryoutHistoryResponse {
  data: StudentTryoutHistoryItem[]
}

export interface StudentNextActionItem {
  id: string
  type: 'continue_course' | 'start_tryout' | 'complete_profile' | 'payment_pending' | 'custom'
  title: string
  description?: string
  href: string
  priority?: number
}

export interface StudentNextActionsResponse {
  data: StudentNextActionItem[]
}

export interface ClassItem {
  id: string
  name: string
  schoolName?: string
  city?: string
  province?: string
}

export interface ClassesResponse {
  data: ClassItem[]
}

export interface SchoolItem {
  id: string
  name: string
  slug?: string
  description?: string
  address?: string
  logoUrl?: string
}

export interface SchoolDetailResponse extends SchoolItem {}

export interface CreateSchoolRequest {
  name: string
  slug?: string
  description?: string
  address?: string
  logoUrl?: string
}

export interface SchoolsResponse {
  data: SchoolItem[]
}

function toInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v)
    return Number.isFinite(n) ? Math.trunc(n) : null
  }
  return null
}

function parseTransactionsResponse(raw: unknown): StudentTransactionsResponse {
  const payload = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
  const listRaw = Array.isArray(payload.data)
    ? payload.data
    : (Array.isArray(raw) ? raw : [])

  const list = (listRaw as Record<string, unknown>[]).map((item) => {
    const finalPrice =
      toInt(item.finalPrice) ??
      toInt(item.final_price)

    const confirmationCode =
      toInt(item.confirmationCode) ??
      toInt(item.confirmation_code)

    const uniqueCode =
      toInt(item.uniqueCode) ??
      toInt(item.unique_code) ??
      confirmationCode
    const quantity =
      toInt(item.quantity) ??
      toInt(item.item_count) ??
      toInt(item.itemCount) ??
      (Array.isArray(item.students) ? item.students.length : null) ??
      (Array.isArray(item.student_items) ? item.student_items.length : null) ??
      1
    const unitPrice =
      toInt(item.unitPrice) ??
      toInt(item.unit_price)
    const subtotal =
      toInt(item.subtotal) ??
      (unitPrice != null && quantity != null ? unitPrice * Math.max(1, quantity) : null)
    const totalRaw =
      toInt(item.grand_total) ??
      toInt(item.total) ??
      toInt(item.total_amount) ??
      0

    // Prioritas total: subtotal + unique code -> total backend -> fallback lama.
    const totalComputed =
      (subtotal != null && subtotal > 0 ? subtotal : (finalPrice != null && finalPrice > 0 ? finalPrice : 0)) +
      (uniqueCode != null && uniqueCode > 0 ? uniqueCode : 0)
    const resolvedTotal = totalComputed > 0 ? totalComputed : (totalRaw > 0 ? totalRaw : 0)

    const studentsRaw = Array.isArray(item.students)
      ? item.students
      : (Array.isArray(item.student_items) ? item.student_items : [])
    const students = (studentsRaw as Record<string, unknown>[]).map((student) => ({
      userId:
        student.userId != null
          ? String(student.userId)
          : (student.user_id != null ? String(student.user_id) : undefined),
      name: student.name != null ? String(student.name) : undefined,
      email: student.email != null ? String(student.email) : undefined,
    }))
    const isCollective =
      Boolean(item.isCollective ?? item.is_collective) ||
      (quantity != null && quantity > 1) ||
      students.length > 1

    return {
      id: String(item.id ?? ''),
      orderId: String(item.orderId ?? item.order_id ?? ''),
      status: String(item.status ?? ''),
      total: resolvedTotal,
      quantity: quantity != null && quantity > 0 ? quantity : 1,
      unitPrice: unitPrice != null && unitPrice > 0 ? unitPrice : undefined,
      subtotal: subtotal != null && subtotal > 0 ? subtotal : undefined,
      uniqueCode: uniqueCode != null && uniqueCode > 0 ? uniqueCode : undefined,
      isCollective,
      students: students.length > 0 ? students : undefined,
      finalPrice: finalPrice != null && finalPrice > 0 ? finalPrice : undefined,
      confirmationCode: confirmationCode != null && confirmationCode > 0 ? confirmationCode : undefined,
      programs: Array.isArray(item.programs)
        ? (item.programs as Array<{ title?: unknown }>).map((p) => ({ title: String(p?.title ?? '') }))
        : [],
      paidAt: String(item.paidAt ?? item.paid_at ?? ''),
    } satisfies TransactionItem
  })

  const totalRaw = payload.total
  const pageRaw = payload.page
  const totalPagesRaw = payload.totalPages ?? payload.total_pages
  return {
    data: list,
    total: typeof totalRaw === 'number' ? Math.trunc(totalRaw) : undefined,
    page: typeof pageRaw === 'number' ? Math.trunc(pageRaw) : undefined,
    totalPages: typeof totalPagesRaw === 'number' ? Math.trunc(totalPagesRaw) : undefined,
  }
}

export interface CertificateItem {
  id: string
  programId: string
  programTitle: string
  issuedAt: string
}

export interface StudentCertificatesResponse {
  data: CertificateItem[]
}

export async function getStudentDashboard(): Promise<StudentDashboardResponse> {
  const res = await apiFetch(`${API_BASE}/student/dashboard`, { headers: authHeaders() })
  return handleResponse<StudentDashboardResponse>(res)
}

export async function getMyCourses(params?: StudentCoursesQuery): Promise<StudentCoursesResponse> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.search) qs.set('search', params.search)
  if (params?.progressStatus && params.progressStatus !== 'all') qs.set('progressStatus', params.progressStatus)
  const q = qs.toString()
  const res = await apiFetch(`${API_BASE}/student/courses${q ? `?${q}` : ''}`, { headers: authHeaders() })
  const data = await handleResponse<unknown>(res)
  if (Array.isArray(data)) return { data: data as MyCourseItem[] }
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>
    const listRaw = Array.isArray(payload.data) ? payload.data : []
    return {
      data: listRaw as MyCourseItem[],
      total: typeof payload.total === 'number' ? Math.trunc(payload.total) : undefined,
      page: typeof payload.page === 'number' ? Math.trunc(payload.page) : undefined,
      totalPages: typeof (payload.totalPages ?? payload.total_pages) === 'number'
        ? Math.trunc((payload.totalPages ?? payload.total_pages) as number)
        : undefined,
    }
  }
  return { data: [] }
}

export async function getTransactions(params?: StudentTransactionsQuery): Promise<StudentTransactionsResponse> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.search) qs.set('search', params.search)
  if (params?.status && params.status !== 'all') qs.set('status', params.status)
  const q = qs.toString()
  const res = await apiFetch(`${API_BASE}/student/transactions${q ? `?${q}` : ''}`, { headers: authHeaders() })
  const data = await handleResponse<unknown>(res)
  return parseTransactionsResponse(data)
}

export async function getStudentTryoutHistory(): Promise<StudentTryoutHistoryResponse> {
  const res = await apiFetch(`${API_BASE}/student/tryouts/history`, { headers: authHeaders() })
  if (res.status === 404) return { data: [] }
  const data = await handleResponse<unknown>(res)
  const payload = (data && typeof data === 'object') ? (data as Record<string, unknown>) : {}
  const listRaw = Array.isArray(payload.data)
    ? payload.data
    : (Array.isArray(data) ? data : [])

  const rows = (listRaw as Record<string, unknown>[]).map((item) => ({
    tryoutId: String(item.tryoutId ?? item.tryout_id ?? ''),
    tryoutTitle: String(item.tryoutTitle ?? item.tryout_title ?? item.title ?? 'Tryout'),
    attemptId: item.attemptId != null ? String(item.attemptId) : (item.attempt_id != null ? String(item.attempt_id) : undefined),
    score: toInt(item.score) ?? 0,
    submittedAt: String(item.submittedAt ?? item.submitted_at ?? item.finished_at ?? ''),
    improvementFromPrevious: toInt(item.improvementFromPrevious ?? item.improvement_from_previous) ?? undefined,
  } satisfies StudentTryoutHistoryItem))
  return { data: rows.filter((row) => row.tryoutId && row.submittedAt) }
}

export async function getStudentNextActions(): Promise<StudentNextActionsResponse> {
  const res = await apiFetch(`${API_BASE}/student/next-actions`, { headers: authHeaders() })
  if (res.status === 404) return { data: [] }
  const data = await handleResponse<unknown>(res)
  const payload = (data && typeof data === 'object') ? (data as Record<string, unknown>) : {}
  const listRaw = Array.isArray(payload.data)
    ? payload.data
    : (Array.isArray(data) ? data : [])
  return {
    data: (listRaw as Record<string, unknown>[]).map((item, index) => ({
      id: String(item.id ?? `next-action-${index}`),
      type: String(item.type ?? 'custom') as StudentNextActionItem['type'],
      title: String(item.title ?? 'Lanjutkan progres Anda'),
      description: item.description != null ? String(item.description) : undefined,
      href: String(item.href ?? '#/student'),
      priority: toInt(item.priority) ?? undefined,
    })),
  }
}

export async function getClasses(): Promise<ClassesResponse> {
  const endpoints = [`${API_BASE}/classes`, `${API_BASE}/class`]
  let lastStatus = 404

  for (const endpoint of endpoints) {
    const res = await apiFetch(endpoint, { headers: authHeaders() })
    if (res.status === 404) {
      lastStatus = res.status
      continue
    }
    const raw = await handleResponse<unknown>(res)
    const payload = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
    const listRaw = Array.isArray(payload.data)
      ? payload.data
      : (Array.isArray(payload.classes)
        ? payload.classes
        : (Array.isArray(raw) ? raw : []))

    return {
      data: (listRaw as Record<string, unknown>[]).map((item, index) => ({
        id: String(item.id ?? item.class_id ?? `class-${index}`),
        name: String(item.name ?? item.class_name ?? item.title ?? 'Class'),
        schoolName:
          item.school_name != null
            ? String(item.school_name)
            : (item.schoolName != null
              ? String(item.schoolName)
              : (item.school != null ? String(item.school) : undefined)),
        city: item.city != null
          ? String(item.city)
          : (item.city_name != null ? String(item.city_name) : undefined),
        province: item.province != null
          ? String(item.province)
          : (item.province_name != null ? String(item.province_name) : undefined),
      })),
    }
  }

  if (lastStatus === 404) return { data: [] }
  return { data: [] }
}

export async function getSchools(): Promise<SchoolsResponse> {
  const res = await apiFetch(`${API_BASE}/schools`, { headers: authHeaders() })
  const raw = await handleResponse<unknown>(res)
  const payload = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  const listRaw = Array.isArray(payload.data)
    ? payload.data
    : (Array.isArray(payload.schools)
      ? payload.schools
      : (Array.isArray(raw) ? raw : []))
  return {
    data: (listRaw as Record<string, unknown>[]).map((item, index) => ({
      id: String(item.id ?? item.school_id ?? `school-${index}`),
      name: String(item.name ?? 'Sekolah'),
      slug: item.slug != null ? String(item.slug) : undefined,
      description: item.description != null ? String(item.description) : undefined,
      address: item.address != null ? String(item.address) : undefined,
      logoUrl: item.logo_url != null ? String(item.logo_url) : (item.logoUrl != null ? String(item.logoUrl) : undefined),
    })),
  }
}

export async function getSchoolById(schoolId: string): Promise<SchoolDetailResponse> {
  const res = await apiFetch(`${API_BASE}/schools/${encodeURIComponent(schoolId)}`, { headers: authHeaders() })
  const raw = await handleResponse<unknown>(res)
  const payload = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  return {
    id: String(payload.id ?? schoolId),
    name: String(payload.name ?? 'Sekolah'),
    slug: payload.slug != null ? String(payload.slug) : undefined,
    description: payload.description != null ? String(payload.description) : undefined,
    address: payload.address != null ? String(payload.address) : undefined,
    logoUrl: payload.logo_url != null ? String(payload.logo_url) : (payload.logoUrl != null ? String(payload.logoUrl) : undefined),
  }
}

export async function createSchool(body: CreateSchoolRequest): Promise<SchoolDetailResponse> {
  const payload = {
    name: body.name,
    slug: body.slug ?? undefined,
    description: body.description ?? undefined,
    address: body.address ?? undefined,
    logoUrl: body.logoUrl ?? undefined,
  }
  const res = await apiFetch(`${API_BASE}/schools`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  const raw = await handleResponse<unknown>(res)
  const data = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? body.name),
    slug: data.slug != null ? String(data.slug) : body.slug,
    description: data.description != null ? String(data.description) : body.description,
    address: data.address != null ? String(data.address) : body.address,
    logoUrl: data.logo_url != null ? String(data.logo_url) : (data.logoUrl != null ? String(data.logoUrl) : body.logoUrl),
  }
}

export async function getCertificates(): Promise<StudentCertificatesResponse> {
  const res = await apiFetch(`${API_BASE}/student/certificates`, { headers: authHeaders() })
  return handleResponse<StudentCertificatesResponse>(res)
}

/** Objek sekolah dari GET profile (camelCase). */
export interface ProfileSchoolRef {
  id: string
  name: string
}

/**
 * Bentuk GET /student/profile & GET /guru/profile (camelCase).
 * Normalizer memetakan `data: {...}`, snake_case, dan `school: { id, name }` ke field datar.
 */
export interface UserProfileResponse {
  id?: string
  name: string
  email: string
  emailVerified?: boolean
  mustSetPassword?: boolean
  phone?: string
  whatsapp?: string
  city?: string
  province?: string
  gender?: string
  role?: string
  roleCode?: string
  roleSlug?: string
  schoolId?: string
  schoolName?: string
  /** Nama sekolah untuk form/tampilan (dari string API atau school.name) */
  school?: string
  subjectId?: string
  classLevel?: string
  birthDate?: string
  bio?: string
  parentName?: string
  parentPhone?: string
  instagram?: string
  [key: string]: unknown
}

export type StudentProfileResponse = UserProfileResponse

export interface UpdateStudentProfileRequest {
  name: string
  email: string
  phone?: string
  whatsapp?: string
  school?: string
  schoolId?: string
  classLevel?: string
  city?: string
  province?: string
  gender?: string
  birthDate?: string
  parentName?: string
  parentPhone?: string
}

export interface UpdateStudentPasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword?: string
}

function unwrapProfilePayload(raw: unknown): Record<string, unknown> {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const root = raw as Record<string, unknown>
  const nested = root.data
  if (nested != null && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }
  return root
}

function firstProfileStr(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return undefined
}

function profileBoolOrUndef(v: unknown): boolean | undefined {
  if (v === true || v === 1 || v === '1' || v === 'true') return true
  if (v === false || v === 0 || v === '0' || v === 'false') return false
  return undefined
}

/** Samakan respons profile API (nested school, data wrapper, snake_case) ke `UserProfileResponse`. */
export function normalizeUserProfile(raw: unknown): UserProfileResponse {
  const inner = unwrapProfilePayload(raw)

  const schoolRaw = inner.school
  let nestedSchoolId: string | undefined
  let nestedSchoolName: string | undefined
  if (schoolRaw != null && typeof schoolRaw === 'object' && !Array.isArray(schoolRaw)) {
    const s = schoolRaw as Record<string, unknown>
    nestedSchoolId = s.id != null ? String(s.id) : undefined
    nestedSchoolName = s.name != null ? String(s.name) : undefined
  }

  const schoolId =
    firstProfileStr(inner.schoolId, inner.school_id) ?? nestedSchoolId
  const schoolName =
    firstProfileStr(inner.schoolName, inner.school_name) ?? nestedSchoolName
  const schoolDisplay =
    typeof schoolRaw === 'string' && schoolRaw.trim()
      ? schoolRaw.trim()
      : (schoolName ?? firstProfileStr(inner.school))

  const emailVerified = profileBoolOrUndef(inner.emailVerified ?? inner.email_verified)
  const mustSetPassword = profileBoolOrUndef(inner.mustSetPassword ?? inner.must_set_password)

  const base: UserProfileResponse = {
    id: inner.id != null ? String(inner.id) : undefined,
    name: firstProfileStr(inner.name) ?? '',
    email: firstProfileStr(inner.email) ?? '',
    phone: firstProfileStr(inner.phone, inner.phoneNumber, inner.phone_number),
    whatsapp: firstProfileStr(inner.whatsapp, inner.whatsappNumber, inner.whatsapp_number),
    city: firstProfileStr(inner.city),
    province: firstProfileStr(inner.province),
    gender: firstProfileStr(inner.gender),
    role: firstProfileStr(inner.role),
    roleCode: firstProfileStr(inner.roleCode, inner.role_code),
    roleSlug: firstProfileStr(inner.roleSlug, inner.role_slug),
    schoolId,
    schoolName,
    school: schoolDisplay,
    subjectId: firstProfileStr(inner.subjectId, inner.subject_id),
    classLevel: firstProfileStr(inner.classLevel, inner.class_level, inner.class, inner.grade),
    birthDate: firstProfileStr(inner.birthDate, inner.birth_date),
    bio: firstProfileStr(inner.bio),
    parentName: firstProfileStr(inner.parentName, inner.parent_name),
    parentPhone: firstProfileStr(inner.parentPhone, inner.parent_phone),
    instagram: firstProfileStr(inner.instagram),
  }
  if (emailVerified !== undefined) base.emailVerified = emailVerified
  if (mustSetPassword !== undefined) base.mustSetPassword = mustSetPassword

  return base
}

export async function getStudentProfile(): Promise<StudentProfileResponse> {
  const res = await apiFetch(`${API_BASE}/student/profile`, { headers: authHeaders() })
  const raw = await handleResponse<unknown>(res)
  return normalizeUserProfile(raw)
}

export async function updateStudentProfile(body: UpdateStudentProfileRequest): Promise<void> {
  const res = await apiFetch(`${API_BASE}/student/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<void>(res)
}

/**
 * Update password siswa.
 * Endpoint utama: /student/profile/password
 * Fallback: /auth/change-password (jika backend memakai endpoint auth global)
 */
export async function updateStudentPassword(body: UpdateStudentPasswordRequest): Promise<void> {
  const payload = {
    currentPassword: body.currentPassword,
    oldPassword: body.currentPassword,
    newPassword: body.newPassword,
    confirmPassword: body.confirmPassword ?? body.newPassword,
  }

  const primary = await apiFetch(`${API_BASE}/student/profile/password`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })

  if (primary.status !== 404) {
    return handleResponse<void>(primary)
  }

  const fallback = await apiFetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  return handleResponse<void>(fallback)
}

// --- Instructor ---

export interface InstructorCourseItem {
  id: string
  title: string
  slug: string
  category?: string
  studentCount?: number
}

export interface InstructorCoursesResponse {
  data: InstructorCourseItem[]
}

export interface InstructorStudentItem {
  userId: string
  name: string
  email: string
  programTitle: string
  progressPercent: number
}

export interface InstructorStudentsResponse {
  data: InstructorStudentItem[]
}

export interface SchoolStudentItem {
  userId: string
  name: string
  email: string
  schoolId?: string
  schoolName?: string
}

const schoolStudentsCache = new Map<string, { expiresAt: number; data: SchoolStudentItem[] }>()

export interface InstructorEarningItem {
  period: string
  revenue: number
  newStudents: number
}

export interface InstructorEarningsResponse {
  data: InstructorEarningItem[]
}

export async function getInstructorCourses(): Promise<InstructorCoursesResponse> {
  const res = await apiFetch(`${API_BASE}/guru/courses`, { headers: authHeaders() })
  return handleResponse<InstructorCoursesResponse>(res)
}

export async function getInstructorStudents(): Promise<InstructorStudentsResponse> {
  const res = await apiFetch(`${API_BASE}/guru/students`, { headers: authHeaders() })
  return handleResponse<InstructorStudentsResponse>(res)
}

export async function getStudentsBySchool(schoolId: string): Promise<SchoolStudentItem[]> {
  const sid = schoolId.trim()
  if (!sid) return []
  const cached = schoolStudentsCache.get(sid)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }
  const endpoints = [
    `${API_BASE}/guru/students?school_id=${encodeURIComponent(sid)}`,
    `${API_BASE}/guru/students?schoolId=${encodeURIComponent(sid)}`,
    `${API_BASE}/schools/${encodeURIComponent(sid)}/students`,
    `${API_BASE}/school/${encodeURIComponent(sid)}/students`,
    `${API_BASE}/guru/schools/${encodeURIComponent(sid)}/students`,
  ]

  const normalize = (raw: unknown): SchoolStudentItem[] => {
    const payload = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
    const listRaw = Array.isArray(payload.data)
      ? payload.data
      : (Array.isArray(payload.students)
        ? payload.students
        : (Array.isArray(raw) ? raw : []))
    return (listRaw as Record<string, unknown>[]).map((item, index) => ({
      userId: String(item.userId ?? item.user_id ?? item.id ?? `student-${index}`),
      name: String(item.name ?? item.full_name ?? item.user_name ?? 'Siswa'),
      email: String(item.email ?? item.user_email ?? ''),
      schoolId: item.schoolId != null ? String(item.schoolId) : (item.school_id != null ? String(item.school_id) : undefined),
      schoolName: item.schoolName != null ? String(item.schoolName) : (item.school_name != null ? String(item.school_name) : undefined),
    })).filter((item) => item.email)
  }

  const fetchWithTimeout = async (url: string, timeoutMs = 4500): Promise<Response> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await apiFetch(url, { headers: authHeaders(), signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  const batches = [endpoints.slice(0, 2), endpoints.slice(2)]
  for (const batch of batches) {
    const settled = await Promise.allSettled(batch.map((url) => fetchWithTimeout(url)))
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i]
      if (result.status !== 'fulfilled') continue
      const res = result.value
      if (res.status === 404) continue
      const data = await handleResponse<unknown>(res)
      const rows = normalize(data)
      schoolStudentsCache.set(sid, {
        expiresAt: Date.now() + 60_000,
        data: rows,
      })
      return rows
    }
  }
  schoolStudentsCache.set(sid, { expiresAt: Date.now() + 15_000, data: [] })
  return []
}

export async function getInstructorEarnings(): Promise<InstructorEarningsResponse> {
  const res = await apiFetch(`${API_BASE}/guru/earnings`, { headers: authHeaders() })
  return handleResponse<InstructorEarningsResponse>(res)
}

export type InstructorProfileResponse = UserProfileResponse

export interface UpdateInstructorProfileRequest {
  name: string
  email: string
  phone?: string
  whatsapp?: string
  school?: string
  schoolId?: string
  subjectId?: string
  classLevel?: string
  city?: string
  province?: string
  gender?: string
  birthDate?: string
  bio?: string
  parentName?: string
  parentPhone?: string
  instagram?: string
}

export interface UpdateInstructorPasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword?: string
}

export async function getInstructorProfile(): Promise<InstructorProfileResponse> {
  const res = await apiFetch(`${API_BASE}/guru/profile`, { headers: authHeaders() })
  const raw = await handleResponse<unknown>(res)
  return normalizeUserProfile(raw)
}

export async function updateInstructorProfile(body: UpdateInstructorProfileRequest): Promise<void> {
  const res = await apiFetch(`${API_BASE}/guru/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<void>(res)
}

export async function updateInstructorPassword(body: UpdateInstructorPasswordRequest): Promise<void> {
  const payload = {
    currentPassword: body.currentPassword,
    oldPassword: body.currentPassword,
    newPassword: body.newPassword,
    confirmPassword: body.confirmPassword ?? body.newPassword,
  }

  const primary = await apiFetch(`${API_BASE}/guru/profile/password`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (primary.status !== 404) return handleResponse<void>(primary)

  const fallback = await apiFetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  return handleResponse<void>(fallback)
}

// --- Instructor / Trainer Tryout Analysis (Auth + role guru/instructor) ---

export interface InstructorTryoutQuestionAnalysis {
  question_number: number
  question_id: string
  question_type: string
  answered_count: number
  unanswered_count: number
  correct_count: number
  wrong_count: number
  correct_percent: number
  wrong_percent: number
  option_distribution: Record<string, number>
}

export interface InstructorTryoutAnalysisResponse {
  tryout_id: string
  tryout_title: string
  participants_count: number
  questions: InstructorTryoutQuestionAnalysis[]
}

export interface InstructorTryoutStudentItem {
  user_id: string
  user_name: string
  user_email: string
  attempt_id: string
  score: number
  max_score: number
  percentile: number
  submitted_at: string
}

export interface InstructorAttemptAIAnalysisResponse {
  attempt_id: string
  summary: string
  recap: string
  strength_areas: string[]
  improvement_areas: string[]
  recommendation: string
}

export async function getInstructorTryoutAnalysis(tryoutId: string): Promise<InstructorTryoutAnalysisResponse> {
  const res = await apiFetch(`${API_BASE}/guru/tryouts/${encodeURIComponent(tryoutId)}/analysis`, { headers: authHeaders() })
  return handleResponse<InstructorTryoutAnalysisResponse>(res)
}

export async function getInstructorTryoutStudents(tryoutId: string): Promise<InstructorTryoutStudentItem[]> {
  const res = await apiFetch(`${API_BASE}/guru/tryouts/${encodeURIComponent(tryoutId)}/students`, { headers: authHeaders() })
  return handleResponse<InstructorTryoutStudentItem[]>(res)
}

export async function getInstructorAttemptAIAnalysis(
  tryoutId: string,
  attemptId: string
): Promise<InstructorAttemptAIAnalysisResponse> {
  const res = await apiFetch(
    `${API_BASE}/guru/tryouts/${encodeURIComponent(tryoutId)}/attempts/${encodeURIComponent(attemptId)}/ai-analysis`,
    { headers: authHeaders() }
  )
  return handleResponse<InstructorAttemptAIAnalysisResponse>(res)
}

// --- Analytics (Visitor Tracking) ---

export interface PageviewPayload {
  page: string
  referrer?: string
  screenWidth?: number
  screenHeight?: number
  timezone?: string
  language?: string
}

export interface AnalyticsEventPayload {
  event: string
  page?: string
  label?: string
  programId?: string
  programSlug?: string
  metadata?: Record<string, unknown>
}

/**
 * Fire-and-forget: catat satu pageview ke backend.
 * Tidak throw error — gagal diam-diam agar tidak mengganggu UX.
 */
export function trackPageview(payload?: Partial<PageviewPayload>): void {
  const body: PageviewPayload = {
    page: payload?.page ?? (window.location.hash.slice(1) || '/'),
    referrer: payload?.referrer ?? (document.referrer || undefined),
    screenWidth: payload?.screenWidth ?? window.screen?.width,
    screenHeight: payload?.screenHeight ?? window.screen?.height,
    timezone: payload?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: payload?.language ?? navigator.language,
  }

  void apiFetch(`${API_BASE}/analytics/pageview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  })
    .then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        recordHttpApiFailure(res, data, { method: 'POST', message: `Analytics pageview HTTP ${res.status}` })
      }
    })
    .catch(() => {
      /* jaringan sudah dicatat di apiFetch */
    })
}

/**
 * Event analytics untuk conversion/funnel. Fire-and-forget.
 * Endpoint yang dipakai: POST /analytics/events.
 */
export function trackAnalyticsEvent(payload: AnalyticsEventPayload): void {
  const body: AnalyticsEventPayload = {
    event: payload.event,
    page: payload.page ?? (window.location.hash.slice(1) || '/'),
    label: payload.label,
    programId: payload.programId,
    programSlug: payload.programSlug,
    metadata: payload.metadata,
  }
  void apiFetch(`${API_BASE}/analytics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  })
    .then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        recordHttpApiFailure(res, data, { method: 'POST', message: `Analytics events HTTP ${res.status}` })
      }
    })
    .catch(() => {
      /* jaringan sudah dicatat di apiFetch */
    })
}

// --- Admin Analytics ---

export interface AnalyticsSummaryItem {
  date: string
  pageviews: number
  uniqueVisitors: number
}

export interface AnalyticsSummaryResponse {
  totalPageviews: number
  uniqueVisitors: number
  data: AnalyticsSummaryItem[]
}

export interface AnalyticsVisitorItem {
  id: string
  sessionId: string
  page: string
  ipAddress: string
  userAgent: string
  referrer: string
  screenWidth: number
  screenHeight: number
  timezone: string
  language: string
  visitedAt: string
}

export interface AnalyticsVisitorsResponse {
  data: AnalyticsVisitorItem[]
  total: number
  page: number
  totalPages: number
}

// --- User Notifications ---

export interface UserNotificationItem {
  id: string
  title: string
  body: string
  type?: string
  read?: boolean
  createdAt?: string
  href?: string
}

export interface UserNotificationsResponse {
  data: UserNotificationItem[]
}

export async function getAnalyticsSummary(params?: {
  startDate?: string
  endDate?: string
  groupBy?: 'day' | 'week' | 'month'
}): Promise<AnalyticsSummaryResponse> {
  const qs = new URLSearchParams()
  if (params?.startDate) qs.set('startDate', params.startDate)
  if (params?.endDate) qs.set('endDate', params.endDate)
  if (params?.groupBy) qs.set('groupBy', params.groupBy)
  const q = qs.toString()
  const res = await apiFetch(`${API_BASE}/admin/analytics/summary${q ? `?${q}` : ''}`, { headers: authHeaders() })
  return handleResponse<AnalyticsSummaryResponse>(res)
}

export async function getAnalyticsVisitors(params?: {
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
}): Promise<AnalyticsVisitorsResponse> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.startDate) qs.set('startDate', params.startDate)
  if (params?.endDate) qs.set('endDate', params.endDate)
  const q = qs.toString()
  const res = await apiFetch(`${API_BASE}/admin/analytics/visitors${q ? `?${q}` : ''}`, { headers: authHeaders() })
  return handleResponse<AnalyticsVisitorsResponse>(res)
}

export async function getMyNotifications(): Promise<UserNotificationsResponse> {
  const res = await apiFetch(`${API_BASE}/notifications`, { headers: authHeaders() })
  const raw = await handleResponse<unknown>(res)
  const payload = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  const listRaw = Array.isArray(payload.data)
    ? payload.data
    : (Array.isArray(raw) ? raw : [])

  const data = (listRaw as Record<string, unknown>[]).map((item, index) => ({
    id: String(item.id ?? `notif-${index}`),
    title: String(item.title ?? item.subject ?? 'Notifikasi'),
    body: String(item.body ?? item.message ?? ''),
    type: item.type ? String(item.type) : undefined,
    read: Boolean(item.read ?? item.is_read ?? false),
    createdAt: item.createdAt ? String(item.createdAt) : (item.created_at ? String(item.created_at) : undefined),
    href: item.href ? String(item.href) : undefined,
  } satisfies UserNotificationItem))

  return { data }
}

export { clearApiErrorLog, getApiErrorLog } from './api-error-log'

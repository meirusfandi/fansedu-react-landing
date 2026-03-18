/**
 * API client sesuai docs/API_REQUIREMENTS.md
 * Base URL: VITE_API_URL (default http://localhost:8080/api/v1)
 * Auth: Bearer token dari store (persist fansedu-auth)
 */

import { clearAuthOnUnauthorized } from './auth-clear'
import { API_BASE, PACKAGES_API_URL } from './api-config'
import type { Course } from '../types/course'

function getStoredToken(): string | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('fansedu-auth') : null
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

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) clearAuthOnUnauthorized()
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(res.status, (data as { message?: string }).message || res.statusText, data as { error?: string; message?: string })
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
  /** Default student jika tidak dikirim */
  role?: 'student' | 'instructor'
}

export interface AuthResponse {
  user: { id: string; name: string; email: string; role: 'student' | 'instructor' }
  token: string
}

export interface MeResponse {
  id: string
  name: string
  email: string
  role: 'student' | 'instructor'
}

export async function apiLogin(body: LoginRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<AuthResponse>(res)
}

export async function apiRegister(body: RegisterRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<AuthResponse>(res)
}

export async function apiLogout(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (res.status === 401) return
  if (!res.ok) await res.json().catch(() => { })
}

export async function apiGetMe(): Promise<MeResponse> {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() })
  return handleResponse<MeResponse>(res)
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

export async function getPackages(): Promise<PackageItem[]> {
  const res = await fetch(PACKAGES_API_URL, {
    cache: 'no-store',
  })
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  const data = await res.json().catch(() => null)
  return parsePackagesResponse(data)
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
  const res = await fetch(`${API_BASE}/programs?${q.toString()}`, { headers: authHeaders() })
  return handleResponse<ProgramsResponse>(res)
}

export async function getProgramBySlug(slug: string): Promise<ProgramDetailResponse | null> {
  const res = await fetch(`${API_BASE}/programs/${encodeURIComponent(slug)}`, { headers: authHeaders() })
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
    program_slug: payload.programSlug,
    programId: payload.programId,
    program_id: payload.programId,
    name: payload.name,
    email: payload.email,
    promoCode: payload.promoCode ?? '',
    promo_code: payload.promoCode ?? '',
  }
  console.log('[initiateCheckout][1] base payload received', payload)
  console.log('[initiateCheckout][2] set body.programSlug', body.programSlug)
  console.log('[initiateCheckout][3] set body.program_slug', body.program_slug)
  console.log('[initiateCheckout][4] set body.programId', body.programId)
  console.log('[initiateCheckout][5] set body.program_id', body.program_id)
  console.log('[initiateCheckout][6] set body.name', body.name)
  console.log('[initiateCheckout][7] set body.email', body.email)
  console.log('[initiateCheckout][8] set body.promoCode', body.promoCode)
  console.log('[initiateCheckout][9] set body.promo_code', body.promo_code)

  if (payload.userId) {
    body.userId = payload.userId
    console.log('[initiateCheckout][10] set body.userId', body.userId)
    body.user_id = payload.userId
    console.log('[initiateCheckout][11] set body.user_id', body.user_id)
  } else {
    console.log('[initiateCheckout][10-11] skip userId mapping because payload.userId is empty')
  }

  // Kirim harga rupiah
  const totalRupiah = payload.expectedTotal != null && payload.expectedTotal > 0 ? payload.expectedTotal : 0
  console.log('[initiateCheckout][12] resolved totalRupiah', totalRupiah)
  if (totalRupiah > 0) {
    body.expectedTotal = totalRupiah
    console.log('[initiateCheckout][13] set body.expectedTotal', body.expectedTotal)
    body.expected_total = totalRupiah
    console.log('[initiateCheckout][14] set body.expected_total', body.expected_total)
    body.total = totalRupiah
    console.log('[initiateCheckout][15] set body.total', body.total)
    body.total_amount = totalRupiah
    console.log('[initiateCheckout][16] set body.total_amount', body.total_amount)
    body.amount = totalRupiah
    console.log('[initiateCheckout][17] set body.amount', body.amount)
    body.price = totalRupiah
    console.log('[initiateCheckout][18] set body.price', body.price)
    body.final_price = totalRupiah
    console.log('[initiateCheckout][19] set body.final_price', body.final_price)
    body.finalPrice = totalRupiah
    console.log('[initiateCheckout][20] set body.finalPrice', body.finalPrice)
  } else {
    console.log('[initiateCheckout][13-20] skip expectedTotal mappings because totalRupiah <= 0')
  }

  if (payload.normalPrice != null && payload.normalPrice > 0) {
    body.normalPrice = payload.normalPrice
    console.log('[initiateCheckout][21] set body.normalPrice', body.normalPrice)
    body.normal_price = payload.normalPrice
    console.log('[initiateCheckout][22] set body.normal_price', body.normal_price)
  } else {
    console.log('[initiateCheckout][21-22] skip normalPrice mappings because payload.normalPrice <= 0')
  }

  console.log('[initiateCheckout][23] final request body before API call', body)
  console.log('[initiateCheckout][24] API_BASE', API_BASE)
  console.log('[initiateCheckout][25] API_BASE/checkout/initiate', `${API_BASE}/checkout/initiate`)
  console.log('[initiateCheckout][26] authHeaders()', authHeaders())
  console.log('[initiateCheckout][27] JSON.stringify(body)', JSON.stringify(body))
  // const shouldSkipApiCall = true
  // if (shouldSkipApiCall) {
  //   console.log('[initiateCheckout][24] API call intentionally skipped for debugging')
  //   throw new ApiError(400, 'Debug mode: payload logged; pemanggilan API di-skip sementara.')
  // }

  const res = await fetch(`${API_BASE}/checkout/initiate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  console.log('[initiateCheckout][28] fetch completed', {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
  })
  const data = await handleResponse<CheckoutInitiateResponse & { confirmation_code?: string | number }>(res)
  console.log('[initiateCheckout][29] handleResponse data', data)

  // Parse confirmation code (bisa string atau number dari backend) -> paksa integer
  const rawConfCode = data.confirmationCode ?? (data as { confirmation_code?: string | number }).confirmation_code
  console.log('[initiateCheckout][30] rawConfCode', rawConfCode)
  const confAsNumber = rawConfCode != null ? Number(rawConfCode) : NaN
  console.log('[initiateCheckout][31] confAsNumber', confAsNumber)
  const confirmationCode = Number.isFinite(confAsNumber) ? Math.trunc(confAsNumber) : undefined
  console.log('[initiateCheckout][32] confirmationCode', confirmationCode)

  // Parse total — backend bisa mengembalikan 0, override dengan expectedTotal
  let totalNum = typeof data.total === 'number' && !Number.isNaN(data.total) ? data.total : 0
  console.log('[initiateCheckout][33] totalNum parsed', totalNum)
  const finalPriceRaw = (data as { finalPrice?: number }).finalPrice
  console.log('[initiateCheckout][34] finalPriceRaw', finalPriceRaw)
  let finalPriceNum = typeof finalPriceRaw === 'number' && finalPriceRaw > 0 ? finalPriceRaw : totalNum
  console.log('[initiateCheckout][35] finalPriceNum resolved', finalPriceNum)
  const normalPriceRaw = (data as { normalPrice?: number }).normalPrice
  console.log('[initiateCheckout][36] normalPriceRaw', normalPriceRaw)
  let normalPriceOut = typeof normalPriceRaw === 'number' && normalPriceRaw > 0 ? normalPriceRaw : undefined
  console.log('[initiateCheckout][37] normalPriceOut initial', normalPriceOut)
  let priceDisplayOut = data.priceDisplay ?? data.program?.priceDisplay
  console.log('[initiateCheckout][38] priceDisplayOut initial', priceDisplayOut)

  // Override: jika backend mengembalikan total 0, gunakan expectedTotal
  const backendReturnedZero = totalNum === 0 || Number.isNaN(totalNum)
  console.log('[initiateCheckout][39] backendReturnedZero', backendReturnedZero)
  if (backendReturnedZero && payload.expectedTotal != null && payload.expectedTotal > 0) {
    console.log('[initiateCheckout][40] apply expectedTotal override', payload.expectedTotal)
    totalNum = payload.expectedTotal
    finalPriceNum = payload.expectedTotal
    priceDisplayOut = `Rp${payload.expectedTotal.toLocaleString('id-ID')}`
    console.log('[initiateCheckout][41] after expectedTotal override', {
      totalNum,
      finalPriceNum,
      priceDisplayOut,
    })
  } else {
    console.log('[initiateCheckout][40-41] skip expectedTotal override')
  }

  if ((normalPriceOut == null || normalPriceOut === 0) && payload.normalPrice != null && payload.normalPrice > 0) {
    console.log('[initiateCheckout][42] apply normalPrice fallback', payload.normalPrice)
    normalPriceOut = payload.normalPrice
    console.log('[initiateCheckout][43] normalPriceOut after fallback', normalPriceOut)
  } else {
    console.log('[initiateCheckout][42-43] skip normalPrice fallback')
  }

  const responseOut = {
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
  console.log('[initiateCheckout][44] final responseOut', responseOut)
  return responseOut
}

export async function createPaymentSession(payload: PaymentSessionRequest): Promise<PaymentSessionResponse> {
  const body: Record<string, unknown> = {
    orderId: payload.orderId,
    order_id: payload.orderId,
    paymentMethod: payload.paymentMethod,
    payment_method: payload.paymentMethod,
    promoCode: payload.promoCode ?? '',
    promo_code: payload.promoCode ?? '',
  }
  // Juga kirim checkoutId jika tersedia (backward compat)
  if (payload.checkoutId) {
    body.checkoutId = payload.checkoutId
    body.checkout_id = payload.checkoutId
  }
  if (payload.uniqueCode != null && payload.uniqueCode >= 100 && payload.uniqueCode <= 999) {
    body.uniqueCode = payload.uniqueCode
    body.unique_code = payload.uniqueCode
  }
  const amountNum = payload.amount != null && !Number.isNaN(Number(payload.amount)) ? Number(payload.amount) : 0
  if (amountNum > 0) {
    body.amount = amountNum
    body.total = amountNum
    body.total_amount = amountNum
  }
  const res = await fetch(`${API_BASE}/checkout/payment-session`, {
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
  const res = await fetch(`${API_BASE}/checkout/orders/${encodeURIComponent(orderId)}/payment-proof`, {
    method: 'POST',
    headers: { ...rest, Accept: 'application/json' },
    body: form,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
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
  const res = await fetch(`${API_BASE}/auth/register-with-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<AuthResponse>(res)
}

// --- Student ---

/** Response GET /student/dashboard — ringkasan untuk halaman dashboard siswa */
export interface StudentDashboardResponse {
  coursesCount?: number
  recentCourses?: MyCourseItem[]
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
}

export interface TransactionItem {
  id: string
  orderId: string
  status: string
  total: number
  finalPrice?: number
  confirmationCode?: number
  programs: { title: string }[]
  paidAt: string
}

export interface StudentTransactionsResponse {
  data: TransactionItem[]
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

    const totalRaw =
      toInt(item.total) ??
      toInt(item.total_amount) ??
      0

    // Total transaksi ditampilkan sebagai harga final + kode konfirmasi (jika ada).
    const totalComputed =
      (finalPrice != null && finalPrice > 0 ? finalPrice : totalRaw) +
      (confirmationCode != null && confirmationCode > 0 ? confirmationCode : 0)

    return {
      id: String(item.id ?? ''),
      orderId: String(item.orderId ?? item.order_id ?? ''),
      status: String(item.status ?? ''),
      total: totalComputed > 0 ? totalComputed : 0,
      finalPrice: finalPrice != null && finalPrice > 0 ? finalPrice : undefined,
      confirmationCode: confirmationCode != null && confirmationCode > 0 ? confirmationCode : undefined,
      programs: Array.isArray(item.programs)
        ? (item.programs as Array<{ title?: unknown }>).map((p) => ({ title: String(p?.title ?? '') }))
        : [],
      paidAt: String(item.paidAt ?? item.paid_at ?? ''),
    } satisfies TransactionItem
  })

  return { data: list }
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
  const res = await fetch(`${API_BASE}/student/dashboard`, { headers: authHeaders() })
  return handleResponse<StudentDashboardResponse>(res)
}

export async function getMyCourses(): Promise<StudentCoursesResponse> {
  const res = await fetch(`${API_BASE}/student/courses`, { headers: authHeaders() })
  return handleResponse<StudentCoursesResponse>(res)
}

export async function getTransactions(): Promise<StudentTransactionsResponse> {
  const res = await fetch(`${API_BASE}/student/transactions`, { headers: authHeaders() })
  const data = await handleResponse<unknown>(res)
  return parseTransactionsResponse(data)
}

export async function getCertificates(): Promise<StudentCertificatesResponse> {
  const res = await fetch(`${API_BASE}/student/certificates`, { headers: authHeaders() })
  return handleResponse<StudentCertificatesResponse>(res)
}

export async function getStudentProfile(): Promise<{ name: string; email: string }> {
  const res = await fetch(`${API_BASE}/student/profile`, { headers: authHeaders() })
  return handleResponse<{ name: string; email: string }>(res)
}

export async function updateStudentProfile(body: { name: string; email: string }): Promise<void> {
  const res = await fetch(`${API_BASE}/student/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<void>(res)
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

export interface InstructorEarningItem {
  period: string
  revenue: number
  newStudents: number
}

export interface InstructorEarningsResponse {
  data: InstructorEarningItem[]
}

export async function getInstructorCourses(): Promise<InstructorCoursesResponse> {
  const res = await fetch(`${API_BASE}/instructor/courses`, { headers: authHeaders() })
  return handleResponse<InstructorCoursesResponse>(res)
}

export async function getInstructorStudents(): Promise<InstructorStudentsResponse> {
  const res = await fetch(`${API_BASE}/instructor/students`, { headers: authHeaders() })
  return handleResponse<InstructorStudentsResponse>(res)
}

export async function getInstructorEarnings(): Promise<InstructorEarningsResponse> {
  const res = await fetch(`${API_BASE}/instructor/earnings`, { headers: authHeaders() })
  return handleResponse<InstructorEarningsResponse>(res)
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
  const res = await fetch(`${API_BASE}/instructor/tryouts/${encodeURIComponent(tryoutId)}/analysis`, { headers: authHeaders() })
  return handleResponse<InstructorTryoutAnalysisResponse>(res)
}

export async function getInstructorTryoutStudents(tryoutId: string): Promise<InstructorTryoutStudentItem[]> {
  const res = await fetch(`${API_BASE}/instructor/tryouts/${encodeURIComponent(tryoutId)}/students`, { headers: authHeaders() })
  return handleResponse<InstructorTryoutStudentItem[]>(res)
}

export async function getInstructorAttemptAIAnalysis(
  tryoutId: string,
  attemptId: string
): Promise<InstructorAttemptAIAnalysisResponse> {
  const res = await fetch(
    `${API_BASE}/instructor/tryouts/${encodeURIComponent(tryoutId)}/attempts/${encodeURIComponent(attemptId)}/ai-analysis`,
    { headers: authHeaders() }
  )
  return handleResponse<InstructorAttemptAIAnalysisResponse>(res)
}

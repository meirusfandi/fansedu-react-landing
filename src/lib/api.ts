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
  constructor(
    public status: number,
    message: string,
    public data?: { error?: string; message?: string }
  ) {
    super(message || data?.message || data?.error || `Error ${status}`)
    this.name = 'ApiError'
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
  if (!res.ok) await res.json().catch(() => {})
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
  priceDisplay: string | null
  priceEarlyBird?: string | null
  priceNormal?: string | null
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
  return (arr as Record<string, unknown>[])
    .filter((p) => get(p, 'is_open', 'isOpen') !== false)
    .map((p) => {
      const waTemplate = get(p, 'wa_message_template', 'waMessageTemplate')
      const ctaUrlVal = get(p, 'cta_url', 'ctaUrl')
      return {
        id: String(p.id ?? ''),
        name: String(get(p, 'name', 'title') ?? ''),
        slug: String(get(p, 'slug') ?? ''),
        shortDescription: get(p, 'short_description', 'shortDescription') != null ? String(get(p, 'short_description', 'shortDescription')) : null,
        priceDisplay: get(p, 'price_display', 'priceDisplay') != null ? String(get(p, 'price_display', 'priceDisplay')) : null,
        priceEarlyBird: get(p, 'price_early_bird', 'priceEarlyBird') != null ? String(get(p, 'price_early_bird', 'priceEarlyBird')) : null,
        priceNormal: get(p, 'price_normal', 'priceNormal') != null ? String(get(p, 'price_normal', 'priceNormal')) : null,
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
  const res = await fetch(PACKAGES_API_URL)
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
    price: 0,
    priceDisplay: pkg.priceDisplay ?? '',
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
}

/** Response 201 POST /checkout/initiate — simpan checkoutId untuk payment-session */
export interface CheckoutInitiateResponse {
  checkoutId: string
  orderId: string
  total: number
  program?: { title: string; priceDisplay: string }
}

/** Body POST /checkout/payment-session — checkoutId dari response initiate */
export interface PaymentSessionRequest {
  checkoutId: string
  paymentMethod: 'bank_transfer' | 'virtual_account' | 'ewallet'
  /** Boleh string kosong "" */
  promoCode?: string
}

export interface PaymentSessionResponse {
  paymentUrl?: string
  orderId: string
  expiry?: string
  virtualAccountNumber?: string
  amount: number
}

export async function initiateCheckout(payload: CheckoutInitiateRequest): Promise<CheckoutInitiateResponse> {
  const res = await fetch(`${API_BASE}/checkout/initiate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  return handleResponse<CheckoutInitiateResponse>(res)
}

export async function createPaymentSession(payload: PaymentSessionRequest): Promise<PaymentSessionResponse> {
  const body = {
    checkoutId: payload.checkoutId,
    paymentMethod: payload.paymentMethod,
    promoCode: payload.promoCode ?? '',
  }
  const res = await fetch(`${API_BASE}/checkout/payment-session`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<PaymentSessionResponse>(res)
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
  programs: { title: string }[]
  paidAt: string
}

export interface StudentTransactionsResponse {
  data: TransactionItem[]
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
  return handleResponse<StudentTransactionsResponse>(res)
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

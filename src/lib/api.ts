/**
 * API client sesuai docs/API_REQUIREMENTS.md
 * Base URL: VITE_API_URL (default http://localhost:8080/api/v1)
 * Auth: Bearer token dari store (persist fansedu-auth)
 */

import { clearAuthOnUnauthorized, clearStoredAuthOnly } from './auth-clear'
import { recordApiClientFailure, recordHttpApiFailure } from './api-error-log'
import { API_BASE, PACKAGES_API_URL } from './api-config'
import { getUserFacingHttpMessage, USER_FACING_SYSTEM_ERROR } from './user-facing-error'
import type { Course } from '../types/course'
import { decodeJwtPayload, normalizeAuthFields } from '../types/auth'
import { splitPhoneForRegisterApi } from '../utils/phone'
import tryoutExamSampleExport from '../data/tryoutExamSampleExport.json'
import { extractModuleFromPayload, type TryoutModuleStat } from '../utils/tryoutModuleAnalysis'

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
    throw new ApiError(0, getUserFacingHttpMessage(0), {})
  }
}

/** Pesan dari body JSON writeError: `{ "error": { "code", "message" } }` atau bentuk datar. */
export function extractApiErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim()
    const err = o.error
    if (typeof err === 'string' && err.trim()) return err.trim()
    if (err && typeof err === 'object' && !Array.isArray(err)) {
      const e = err as Record<string, unknown>
      if (typeof e.message === 'string' && e.message.trim()) return e.message.trim()
    }
  }
  return fallback
}

/** Kode stabil API v1 (`error.code`, UPPER_SNAKE) — untuk log / branching opsional; jangan tampilkan mentah ke user. */
export function extractApiErrorCode(data: unknown): string | undefined {
  if (data && typeof data === 'object') {
    const err = (data as Record<string, unknown>).error
    if (err && typeof err === 'object' && !Array.isArray(err)) {
      const c = (err as Record<string, unknown>).code
      if (typeof c === 'string' && c.trim()) return c.trim()
    }
  }
  return undefined
}

export class ApiError extends Error {
  status: number
  data?: { error?: string | { code?: string; message?: string }; message?: string }

  constructor(
    status: number,
    message: string,
    data?: { error?: string | { code?: string; message?: string }; message?: string },
  ) {
    super(message?.trim() ? message : USER_FACING_SYSTEM_ERROR)
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
    const technical = extractApiErrorMessage(data, 'Tidak terotorisasi (401)')
    recordHttpApiFailure(res, data, { method, message: technical })
    const errBody = data as { message?: string; error?: string }

    if (meta?.on401 === 'credentials') {
      clearStoredAuthOnly()
      throw new ApiError(401, 'Email atau kata sandi tidak valid.', errBody)
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
    const errBody = data as unknown as { message?: string; error?: string | { code?: string; message?: string } }
    const technical = extractApiErrorMessage(data, res.statusText)
    recordHttpApiFailure(res, data, { method, message: technical })
    throw new ApiError(res.status, getUserFacingHttpMessage(res.status), errBody)
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
  /** Satu nomor dari form; dipecah jadi `phone` (0xx) + `whatsapp` (62xx) saat POST register. */
  phone: string
  /** Default student jika tidak dikirim — gunakan `guru` untuk akun guru (dipetakan ke slug dari GET /roles). */
  role?: 'student' | 'guru'
  /** Slug role persis dari GET /api/v1/roles; jika diisi, mengalahkan `role`. */
  roleSlug?: string
  /** Slug program/paket — opsional; kirim jika daftar terkait program tertentu. */
  slug?: string
  /** Alias lama untuk `slug` (nilai yang sama dikirim sebagai `programSlug` ke API). */
  program_slug?: string
  /** Master data registrasi: jenjang pendidikan */
  levelId?: string
  /** Master data registrasi: bidang pelajaran */
  subjectId?: string
  /** Master data registrasi: kelas (1-12, mengikuti jenjang) */
  classLevel?: string
}

export interface RoleListItem {
  slug: string
  name?: string
  code?: string
  id?: string
}

export interface RegisterClassOption {
  value: string
  label: string
}

export interface RegisterSubjectOption {
  id: string
  name: string
  slug: string
}

export interface RegisterLevelOption {
  id: string
  name: string
  slug: string
  description?: string
  classes: RegisterClassOption[]
  subjects: RegisterSubjectOption[]
}

export interface RegisterMasterDataResponse {
  levels: RegisterLevelOption[]
}

export interface AiGeneratedQuestion {
  id: string
  subject: string
  grade: string
  topic: string
  difficulty: string
  questionText: string
  choices: string[]
  correctAnswer?: string
  explanation?: string
  solutionSteps: string[]
  conceptTags: string[]
  estimatedSec?: number
}

export interface GenerateQuestionsRequest {
  subject: string
  grade: string
  topic: string
  difficulty: string
  count: number
}

export interface SubmitAiAnswerRequest {
  questionId: string
  answer: string
  timeSpentMs: number
}

export interface SubmitAiAnswerResponse {
  questionId: string
  isCorrect: boolean
  correctAnswer?: string
  explanation?: string
}

export interface AiAnalysisResponse {
  accuracyPercent: number
  totalAttempts: number
  correctAttempts: number
  avgTimeMs: number
  weakTopic?: string
  recommendations: AiGeneratedQuestion[]
}

export interface AiRankingItem {
  userId: string
  score: number
  accuracyPct: number
}

export interface CreateSubscriptionRequest {
  planCode: string
  startAt?: string
  endAt?: string
}

export interface SubscriptionRecord {
  id: string
  userId: string
  planCode: string
  status: string
  startAt: string
  endAt: string
  createdAt: string
}

function parseAiGeneratedQuestion(raw: unknown): AiGeneratedQuestion | null {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  if (!o) return null
  const id = String(o.id ?? o.ID ?? '')
  const questionText = String(o.questionText ?? o.QuestionText ?? '')
  if (!id || !questionText) return null
  const choicesRaw = o.choices ?? o.choicesJson ?? o.ChoicesJSON
  const stepsRaw = o.solutionSteps ?? o.SolutionSteps
  const tagsRaw = o.conceptTags ?? o.ConceptTags
  return {
    id,
    subject: String(o.subject ?? o.Subject ?? ''),
    grade: String(o.grade ?? o.Grade ?? ''),
    topic: String(o.topic ?? o.Topic ?? ''),
    difficulty: String(o.difficulty ?? o.Difficulty ?? ''),
    questionText,
    choices: Array.isArray(choicesRaw) ? choicesRaw.map((c) => String(c)).filter(Boolean) : [],
    correctAnswer:
      o.correctAnswer != null
        ? String(o.correctAnswer)
        : (o.CorrectAnswer != null ? String(o.CorrectAnswer) : undefined),
    explanation:
      o.explanation != null
        ? String(o.explanation)
        : (o.Explanation != null ? String(o.Explanation) : undefined),
    solutionSteps: Array.isArray(stepsRaw) ? stepsRaw.map((s) => String(s)).filter(Boolean) : [],
    conceptTags: Array.isArray(tagsRaw) ? tagsRaw.map((t) => String(t)).filter(Boolean) : [],
    estimatedSec: toFiniteNumber(o.estimatedSec ?? o.EstimatedSec) ?? undefined,
  }
}

function parseRegisterMasterData(raw: unknown): RegisterMasterDataResponse {
  const root = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  const levelsRaw = Array.isArray(root.levels)
    ? root.levels
    : (root.data && typeof root.data === 'object' && Array.isArray((root.data as Record<string, unknown>).levels)
      ? (root.data as Record<string, unknown>).levels
      : [])
  const levels = (levelsRaw as Record<string, unknown>[]).map((lv) => {
    const classesRaw = Array.isArray(lv.classes) ? lv.classes : []
    const subjectsRaw = Array.isArray(lv.subjects) ? lv.subjects : []
    return {
      id: String(lv.id ?? ''),
      name: String(lv.name ?? ''),
      slug: String(lv.slug ?? ''),
      description: lv.description != null ? String(lv.description) : undefined,
      classes: (classesRaw as Record<string, unknown>[]).map((c) => ({
        value: String(c.value ?? ''),
        label: String(c.label ?? c.value ?? ''),
      })).filter((c) => c.value),
      subjects: (subjectsRaw as Record<string, unknown>[]).map((s) => ({
        id: String(s.id ?? ''),
        name: String(s.name ?? ''),
        slug: String(s.slug ?? ''),
      })).filter((s) => s.id),
    } satisfies RegisterLevelOption
  }).filter((lv) => lv.id && lv.slug)

  return { levels }
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
        const technical = extractApiErrorMessage(data, res.statusText)
        recordHttpApiFailure(res, data, { method: 'GET', message: technical })
        throw new ApiError(res.status, getUserFacingHttpMessage(res.status), data as { error?: string; message?: string })
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

/** Data master publik untuk form register: jenjang + kelas + bidang. */
export async function getRegisterMasterData(): Promise<RegisterMasterDataResponse> {
  const res = await apiFetch(`${API_BASE}/auth/register/master-data`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const technical = extractApiErrorMessage(data, res.statusText)
    recordHttpApiFailure(res, data, { method: 'GET', message: technical })
    throw new ApiError(res.status, getUserFacingHttpMessage(res.status), data as { error?: string; message?: string })
  }
  const raw = await res.json().catch(() => ({}))
  return parseRegisterMasterData(raw)
}

export async function generateQuestions(payload: GenerateQuestionsRequest): Promise<AiGeneratedQuestion[]> {
  const body = {
    subject: payload.subject,
    grade: payload.grade,
    topic: payload.topic,
    difficulty: payload.difficulty,
    count: payload.count,
  }
  const res = await apiFetch(`${API_BASE}/generate-questions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  const data = await handleResponse<Record<string, unknown>>(res, { method: 'POST' })
  const rowsRaw = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
  return (rowsRaw as unknown[])
    .map((row) => parseAiGeneratedQuestion(row))
    .filter((row): row is AiGeneratedQuestion => Boolean(row))
}

export async function submitAnswer(payload: SubmitAiAnswerRequest): Promise<SubmitAiAnswerResponse> {
  const res = await apiFetch(`${API_BASE}/submit-answer`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await handleResponse<Record<string, unknown>>(res, { method: 'POST' })
  return {
    questionId: String(data.questionId ?? data.question_id ?? ''),
    isCorrect: Boolean(data.isCorrect ?? data.is_correct),
    correctAnswer:
      data.correctAnswer != null
        ? String(data.correctAnswer)
        : (data.correct_answer != null ? String(data.correct_answer) : undefined),
    explanation: data.explanation != null ? String(data.explanation) : undefined,
  }
}

export async function getQuestionAnalysis(params: {
  topic?: string
  grade?: string
}): Promise<AiAnalysisResponse> {
  const q = new URLSearchParams()
  if (params.topic) q.set('topic', params.topic)
  if (params.grade) q.set('grade', params.grade)
  const query = q.toString()
  const res = await apiFetch(`${API_BASE}/analysis${query ? `?${query}` : ''}`, { headers: authHeaders() })
  const data = await handleResponse<Record<string, unknown>>(res, { method: 'GET' })
  const recRaw = Array.isArray(data.recommendations) ? data.recommendations : []
  return {
    accuracyPercent: toFiniteNumber(data.accuracyPercent) ?? 0,
    totalAttempts: toInt(data.totalAttempts) ?? 0,
    correctAttempts: toInt(data.correctAttempts) ?? 0,
    avgTimeMs: toInt(data.avgTimeMs) ?? 0,
    weakTopic: data.weakTopic != null ? String(data.weakTopic) : undefined,
    recommendations: recRaw
      .map((row) => parseAiGeneratedQuestion(row))
      .filter((row): row is AiGeneratedQuestion => Boolean(row)),
  }
}

export async function getNationalRanking(limit = 20): Promise<AiRankingItem[]> {
  const q = new URLSearchParams()
  q.set('limit', String(Math.max(1, Math.min(100, limit))))
  const res = await apiFetch(`${API_BASE}/ranking?${q.toString()}`, {
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await handleResponse<Record<string, unknown>>(res, { method: 'GET' })
  const rowsRaw = Array.isArray(data.data) ? data.data : []
  return (rowsRaw as Record<string, unknown>[]).map((row) => ({
    userId: String(row.userId ?? row.user_id ?? ''),
    score: toFiniteNumber(row.score) ?? 0,
    accuracyPct: toFiniteNumber(row.accuracyPct ?? row.accuracy_pct) ?? 0,
  })).filter((row) => row.userId)
}

export async function listGeneratedQuestions(params: {
  subject?: string
  grade?: string
  topic?: string
  difficulty?: string
  limit?: number
}): Promise<AiGeneratedQuestion[]> {
  const q = new URLSearchParams()
  if (params.subject) q.set('subject', params.subject)
  if (params.grade) q.set('grade', params.grade)
  if (params.topic) q.set('topic', params.topic)
  if (params.difficulty) q.set('difficulty', params.difficulty)
  if (params.limit != null) q.set('limit', String(Math.max(1, Math.min(100, params.limit))))
  const query = q.toString()
  const res = await apiFetch(`${API_BASE}/questions${query ? `?${query}` : ''}`, {
    headers: authHeaders(),
  })
  const data = await handleResponse<Record<string, unknown>>(res, { method: 'GET' })
  const rowsRaw = Array.isArray(data.data) ? data.data : []
  return (rowsRaw as unknown[])
    .map((row) => parseAiGeneratedQuestion(row))
    .filter((row): row is AiGeneratedQuestion => Boolean(row))
}

export async function createSubscription(payload: CreateSubscriptionRequest): Promise<SubscriptionRecord> {
  const body: Record<string, unknown> = { planCode: payload.planCode }
  if (payload.startAt) body.startAt = payload.startAt
  if (payload.endAt) body.endAt = payload.endAt
  const res = await apiFetch(`${API_BASE}/subscription`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  const data = await handleResponse<Record<string, unknown>>(res, { method: 'POST' })
  const root =
    data.data && typeof data.data === 'object' && !Array.isArray(data.data)
      ? (data.data as Record<string, unknown>)
      : data
  return {
    id: String(root.id ?? root.ID ?? ''),
    userId: String(root.userId ?? root.UserID ?? ''),
    planCode: String(root.planCode ?? root.PlanCode ?? ''),
    status: String(root.status ?? root.Status ?? ''),
    startAt: String(root.startAt ?? root.StartAt ?? ''),
    endAt: String(root.endAt ?? root.EndAt ?? ''),
    createdAt: String(root.createdAt ?? root.CreatedAt ?? ''),
  }
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
  const phoneTrim = typeof body.phone === 'string' ? body.phone.replace(/\s+/g, ' ').trim() : ''
  const payload: Record<string, unknown> = {
    name: body.name,
    email: body.email,
    password: body.password,
  }
  if (phoneTrim) {
    const { phone: phoneLocal, whatsapp: whatsappIntl } = splitPhoneForRegisterApi(phoneTrim)
    if (phoneLocal) payload.phone = phoneLocal
    if (whatsappIntl) payload.whatsapp = whatsappIntl
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
  if (body.levelId?.trim()) payload.levelId = body.levelId.trim()
  if (body.subjectId?.trim()) payload.subjectId = body.subjectId.trim()
  if (body.classLevel?.trim()) payload.classLevel = body.classLevel.trim()
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
  /** `AbortSignal.timeout` tidak mengandalkan timer tab yang di-throttle sekeras `setTimeout` saat tab di-background. */
  const signal =
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(AUTH_ME_TIMEOUT_MS)
      : (() => {
          const c = new AbortController()
          window.setTimeout(() => c.abort(), AUTH_ME_TIMEOUT_MS)
          return c.signal
        })()
  try {
    const res = await apiFetch(`${API_BASE}/auth/me`, {
      headers: authHeaders(),
      signal,
    })
    return await handleResponse<MeResponse>(res)
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      /** Jangan logout: timeout / jaringan lambat ≠ sesi habis. */
      throw new ApiError(408, getUserFacingHttpMessage(408), {})
    }
    throw e
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
        const technical = extractApiErrorMessage(errBody, res.statusText)
        recordHttpApiFailure(res, errBody, { method: 'GET', message: technical })
        throw new ApiError(res.status, getUserFacingHttpMessage(res.status), errBody)
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
  /** Nomor HP / WhatsApp pembeli (wajib di checkout guest). */
  phone?: string
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

export interface ClaimedVoucherItem {
  claimId: string
  promoId: string
  code: string
  discountType?: string
  discountValue?: number
  validUntil?: string
}

export interface MyClaimedVouchersResponse {
  data: ClaimedVoucherItem[]
}

export async function initiateCheckout(payload: CheckoutInitiateRequest): Promise<CheckoutInitiateResponse> {
  const body: Record<string, unknown> = {
    programSlug: payload.programSlug,
    programId: payload.programId,
    name: payload.name,
    email: payload.email,
    promoCode: payload.promoCode ?? '',
  }

  const phoneInit = typeof payload.phone === 'string' ? payload.phone.replace(/\s+/g, ' ').trim() : ''
  if (phoneInit) {
    const { phone: phoneLocal, whatsapp: whatsappIntl } = splitPhoneForRegisterApi(phoneInit)
    if (phoneLocal) body.phone = phoneLocal
    if (whatsappIntl) body.whatsapp = whatsappIntl
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

/** Klaim voucher user login (siswa/guru): POST /vouchers/claim, sukses 204 no content. */
export async function claimVoucher(code: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/vouchers/claim`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code: code.trim() }),
  })
  if (res.status === 204) return
  await handleResponse<unknown>(res)
}

/** Daftar voucher yang sudah diklaim user login: GET /vouchers/mine */
export async function getMyClaimedVouchers(): Promise<MyClaimedVouchersResponse> {
  const res = await apiFetch(`${API_BASE}/vouchers/mine`, { headers: authHeaders() })
  const raw = await handleResponse<unknown>(res)
  const root = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  const arr = Array.isArray(root.data) ? root.data : (Array.isArray(raw) ? raw : [])
  return {
    data: (arr as Record<string, unknown>[]).map((item) => ({
      claimId: String(item.claimId ?? item.claim_id ?? ''),
      promoId: String(item.promoId ?? item.promo_id ?? ''),
      code: String(item.code ?? ''),
      discountType: item.discountType != null
        ? String(item.discountType)
        : (item.discount_type != null ? String(item.discount_type) : undefined),
      discountValue:
        toFiniteNumber(item.discountValue ?? item.discount_value),
      validUntil: item.validUntil != null
        ? String(item.validUntil)
        : (item.valid_until != null ? String(item.valid_until) : undefined),
    })).filter((v) => v.code),
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
    const technical = extractApiErrorMessage(data, res.statusText)
    recordHttpApiFailure(res, data, { method: 'POST', message: technical })
    throw new ApiError(res.status, getUserFacingHttpMessage(res.status), data as { error?: string; message?: string })
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
  /** Dari API meta tryout (GET /student/tryouts, /:id) — opsional */
  durationMinutes?: number
  questionCount?: number
  pointsPerQuestion?: number
  maxScore?: number
  /** Teks/HTML ringkas aturan penilaian dari backend */
  gradingNotes?: string
}

export interface TryoutStartResponse {
  attemptId?: string
  examUrl?: string
  startedAt?: string
  expiresAt?: string
  timeLeftSeconds?: number
  [key: string]: unknown
}

/** Satu soal pada lembar tryout (kompatibel fansedu-lms / Go: type, body HTML, options). */
export interface TryoutExamQuestion {
  id: string
  order: number
  /** Grup modul/topik dari API (`module`, `bidang`, `tags`, dll.) — untuk analisis pasca-submit. */
  moduleKey?: string
  moduleLabel?: string
  /** Dari QuestionResponse backend (tanpa kunci jawaban di lembar siswa). */
  bidang?: string
  tags?: string[]
  /** Teks ringkas / judul (opsional jika ada bodyHtml) */
  prompt: string
  /** HTML dari field `body` backend (render dengan QuestionBody) */
  bodyHtml?: string
  imageUrl?: string | null
  questionType: 'multiple_choice' | 'short' | 'true_false'
  options: { key: string; label: string }[]
  /** Jawaban tersimpan di server (resume) */
  savedSelectedOption?: string
  savedAnswerText?: string
}

/** Lembar ujian: daftar soal + batas waktu. */
export interface TryoutAttemptPaper {
  title?: string
  durationMinutes: number
  /** Batas waktu dari server (ISO), opsional — dipakai untuk sinkron timer */
  endsAt?: string
  /** Sisa detik dari GET /attempts/:id/questions — diprioritaskan untuk timer */
  timeLeftSeconds?: number
  questions: TryoutExamQuestion[]
}

/** Agregat per jenis soal di `overallAnalysis` (POST submit / GET attempt). */
export interface TryoutOverallAnalysisByQuestionType {
  /** Label tampilan, mis. "Pilihan ganda". */
  questionTypeLabel?: string
  total?: number
  correct?: number
  wrong?: number
  unscored?: number
  scoreGot?: number
  maxScore?: number
}

/** Ringkasan numerik + narasi dari server setelah submit (alias `overall_analysis`). */
export interface TryoutOverallAnalysis {
  totalQuestions?: number
  answeredCount?: number
  unansweredCount?: number
  correctCount?: number
  wrongCount?: number
  autoUngradedCount?: number
  /** Persen capaian skor (0–100), dari server bila ada. */
  scorePercent?: number
  scoreGot?: number
  maxScore?: number
  /** Paragraf Bahasa Indonesia (sumber utama narasi; bisa dikirim ke AI untuk feedback). */
  summary?: string
  byQuestionType?: TryoutOverallAnalysisByQuestionType[]
}

export interface TryoutAttemptSubmitResult {
  score?: number
  /** Skor maksimum lembar (SubmitResponse); wajib di body submit bila tersedia. */
  maxScore: number
  message?: string
  submittedAt?: string
  /**
   * Opsional: kirim hanya jika sudah dihitung (0–100, persentil dalam peserta tryout yang sama, minimal 2 skor).
   * Jangan kirim `null` atau `0` palsu sebagai placeholder; hilangkan field jika belum ada.
   */
  percentile?: number
  feedback?: string
  /** false jika backend menandai penilaian belum final (skor 0 bisa sementara). */
  graded?: boolean
  /** Contoh: pending, completed — dari API bila ada. */
  gradingStatus?: string
  /**
   * Dari POST …/submit (`dto.SubmitResponse.review` / QuestionReviewOutcome[]).
   * Jika terisi, UI memakai ini dan boleh melewati GET …/review terpisah.
   */
  review?: TryoutAttemptReviewRow[]
  /**
   * Agregat per modul: benar / salah / belum dinilai; selaras dengan `isCorrect` + skor per soal.
   */
  moduleAnalysis?: TryoutModuleStat[]
  /** Alias isi sama dengan `moduleAnalysis` (kompatibilitas kontrak backend). */
  moduleSummary?: TryoutModuleStat[]
  /** Analisis agregat + narasi (POST submit / GET attempt). */
  overallAnalysis?: TryoutOverallAnalysis
}

/** Satu baris pembahasan pasca-submit (GET …/review — opsional di backend). */
export interface TryoutAttemptReviewRow {
  questionId: string
  moduleKey?: string
  moduleLabel?: string
  moduleId?: string
  moduleTitle?: string
  bidang?: string
  tags?: string[]
  /** Skor diperoleh pada soal ini (kontrak backend: `scoreGot`). */
  scoreGot?: number
  /** Skor maks soal (bila dikirim per baris review). */
  maxScore?: number
  order?: number
  /** Mis. "Pilihan ganda", "Benar / Salah", "Isian singkat". */
  questionTypeLabel?: string
  /** Satu kalimat ringkas dari server. */
  analysisSummary?: string
  /** Narasi per tipe soal (PG, isian, dll.). */
  analysisDetail?: string
  prompt?: string
  yourAnswer?: string
  correctAnswer?: string
  explanation?: string
  /** `null` = server eksplisit: belum bisa dinilai (bukan benar/salah). */
  isCorrect?: boolean | null
}

/** Body PUT /attempts/:attemptId/answers/:questionId */
export interface PutAttemptAnswerBody {
  answerText?: string
  selectedOption?: string
  isMarked?: boolean
}

export interface StudentAttemptListItem {
  id: string
  tryoutId: string
  tryoutTitle?: string
  status?: string
  score?: number
  maxScore?: number
  percentile?: number
  timeSecondsSpent?: number
  startedAt?: string
  submittedAt?: string
}

export interface StudentAttemptDetail {
  id: string
  tryoutId?: string
  tryoutTitle?: string
  status?: string
  score?: number
  maxScore: number
  /** Opsional; sama aturan dengan submit — absen jika belum dihitung. */
  percentile?: number
  timeSecondsSpent?: number
  startedAt?: string
  submittedAt?: string
  /** Untuk status submitted: pembahasan per soal (refresh halaman / GET setelah submit). */
  review?: TryoutAttemptReviewRow[]
  moduleAnalysis?: TryoutModuleStat[]
  /** Alias isi sama dengan `moduleAnalysis`. */
  moduleSummary?: TryoutModuleStat[]
  overallAnalysis?: TryoutOverallAnalysis
}

export interface TryoutLeaderboardRankResponse {
  /** BE baru: false = belum daftar / belum ada entri leaderboard untuk user ini. */
  inLeaderboard?: boolean
  rank?: number
  score?: number
  percentile?: number
}

export interface StudentTryoutStatusResponse {
  isRegistered: boolean
  hasAttempted: boolean
  canRetake: boolean
  attemptCount?: number
  lastAttemptId?: string
  /** Jadwal & gate dari BE (sumber utama untuk tombol Daftar / Mulai). */
  opensAt?: string
  closesAt?: string
  tryoutStatus?: string
  canRegister?: boolean
  canStartExam?: boolean
  startDisabledReason?: string
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

/** Skor / persentil dari API (bisa desimal, mis. 85.5). */
function toFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.trim())
    if (Number.isFinite(n)) return n
  }
  return undefined
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

function parseOptionalPositiveInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.trunc(value))
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.trim())
    if (Number.isFinite(n)) return Math.max(0, Math.trunc(n))
  }
  return undefined
}

/** Jumlah soal dari payload item tryout (list/detail). */
function parseTryoutMetaQuestionCount(item: Record<string, unknown>): number | undefined {
  return parseOptionalPositiveInt(
    item.questionsCount ??
      item.questions_count ??
      item.questionCount ??
      item.question_count ??
      item.totalQuestions ??
      item.total_questions ??
      item.numQuestions ??
      item.num_questions ??
      item.problemCount ??
      item.problem_count ??
      item.soal_count,
  )
}

function parseTryoutMetaPointsPerQuestion(item: Record<string, unknown>): number | undefined {
  const v = parseOptionalPositiveInt(
    item.pointsPerQuestion ??
      item.points_per_question ??
      item.scorePerQuestion ??
      item.score_per_question ??
      item.pointPerQuestion,
  )
  return v === 0 ? undefined : v
}

function parseTryoutMetaMaxScore(item: Record<string, unknown>): number | undefined {
  return parseOptionalPositiveInt(
    item.maxScore ?? item.max_score ?? item.totalPoints ?? item.total_points ?? item.fullScore ?? item.full_score,
  )
}

function parseTryoutMetaGradingNotes(item: Record<string, unknown>): string | undefined {
  const raw =
    item.gradingNotes ??
    item.grading_notes ??
    item.gradingRules ??
    item.grading_rules ??
    item.examRules ??
    item.exam_rules ??
    item.penilaian ??
    item.rulesText ??
    item.rules_text
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return undefined
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
              : undefined

      const durationMinutes = parseDurationMinutesFromPayload(item)
      const questionCount = parseTryoutMetaQuestionCount(item)
      const pointsPerQuestion = parseTryoutMetaPointsPerQuestion(item)
      const maxScore = parseTryoutMetaMaxScore(item)
      const gradingNotes = parseTryoutMetaGradingNotes(item)

      return {
        id,
        title,
        shortTitle: shortTitleRaw ? String(shortTitleRaw) : undefined,
        description: descriptionRaw ? String(descriptionRaw) : undefined,
        startAt,
        intervalDays,
        registrationDeadlineAt: registrationDeadlineAtRaw ? String(registrationDeadlineAtRaw) : undefined,
        closeAt: closeAtRaw ? String(closeAtRaw).trim() : undefined,
        ...(badgeStr != null ? { badge: badgeStr } : {}),
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
        ...(durationMinutes != null ? { durationMinutes } : {}),
        ...(questionCount != null ? { questionCount } : {}),
        ...(pointsPerQuestion != null ? { pointsPerQuestion } : {}),
        ...(maxScore != null ? { maxScore } : {}),
        ...(gradingNotes != null ? { gradingNotes } : {}),
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

/** GET /student/tryouts — semua TO non-draft sesuai bidang siswa */
export async function getStudentTryouts(): Promise<OpenTryoutItem[]> {
  const res = await apiFetch(`${API_BASE}/student/tryouts`, { headers: authHeaders() })
  const data = await handleResponse<unknown>(res)
  return parseOpenTryoutsResponse(data)
}

/** GET /student/tryouts/open — TO buka (open + closes_at belum lewat), filter bidang */
export async function getStudentTryoutsOpen(): Promise<OpenTryoutItem[]> {
  const res = await apiFetch(`${API_BASE}/student/tryouts/open`, { headers: authHeaders() })
  const data = await handleResponse<unknown>(res)
  return parseOpenTryoutsResponse(data)
}

function coerceStudentTryoutDetailPayload(raw: unknown): unknown {
  if (raw == null) return raw
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    if (Array.isArray(r.data)) return r
    if (r.data != null && typeof r.data === 'object' && !Array.isArray(r.data)) {
      return { data: [r.data] }
    }
    return { data: [r] }
  }
  return raw
}

/** GET /student/tryouts/:tryoutId — detail satu TO (404 jika tidak untuk bidang siswa) */
export async function getStudentTryoutDetail(tryoutId: string): Promise<OpenTryoutItem> {
  const res = await apiFetch(`${API_BASE}/student/tryouts/${encodeURIComponent(tryoutId)}`, {
    headers: authHeaders(),
  })
  const data = await handleResponse<unknown>(res)
  const list = parseOpenTryoutsResponse(coerceStudentTryoutDetailPayload(data))
  const byId = list.find((t) => t.id === tryoutId)
  if (byId) return byId
  if (list.length === 1) return list[0]
  throw new ApiError(404, 'Tryout tidak ditemukan.', {})
}

/** GET /student/attempts — daftar attempt milik user */
export async function getStudentAttempts(): Promise<StudentAttemptListItem[]> {
  const res = await apiFetch(`${API_BASE}/student/attempts`, { headers: authHeaders() })
  if (res.status === 404) return []
  const data = await handleResponse<unknown>(res)
  const payload = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const listRaw = Array.isArray(payload.data)
    ? payload.data
    : (Array.isArray(data) ? data : [])
  return (listRaw as Record<string, unknown>[]).map((item) => {
    const tryoutIdRaw =
      item.tryoutId ??
      item.tryout_id ??
      item.tryoutSessionId ??
      item.tryout_session_id
    return {
      id: String(item.id ?? item.attemptId ?? item.attempt_id ?? ''),
      tryoutId: tryoutIdRaw != null ? String(tryoutIdRaw) : '',
      tryoutTitle:
        item.tryoutTitle != null
          ? String(item.tryoutTitle)
          : (item.tryout_title != null ? String(item.tryout_title) : undefined),
      status: item.status != null ? String(item.status) : undefined,
      score: toFiniteNumber(item.score),
      maxScore: toFiniteNumber(item.maxScore ?? item.max_score),
      percentile: toFiniteNumber(item.percentile),
      timeSecondsSpent: toFiniteNumber(item.timeSecondsSpent ?? item.time_seconds_spent),
      startedAt: item.startedAt != null ? String(item.startedAt) : (item.started_at != null ? String(item.started_at) : undefined),
      submittedAt:
        item.submittedAt != null
          ? String(item.submittedAt)
          : (item.submitted_at != null ? String(item.submitted_at) : undefined),
    }
  }).filter((row) => Boolean(row.id))
}

/** GET /student/attempts/:attemptId */
export async function getStudentAttemptDetail(attemptId: string): Promise<StudentAttemptDetail> {
  const res = await apiFetch(`${API_BASE}/student/attempts/${encodeURIComponent(attemptId)}`, {
    headers: authHeaders(),
  })
  const data = await handleResponse<Record<string, unknown>>(res)
  const o =
    data.data != null && typeof data.data === 'object' && !Array.isArray(data.data)
      ? (data.data as Record<string, unknown>)
      : data
  const tryoutIdRaw = o.tryoutId ?? o.tryout_id ?? o.tryoutSessionId ?? o.tryout_session_id
  const layers: Record<string, unknown>[] = [o]
  const embeddedReview = pickEmbeddedReviewFromSubmit(o, layers)
  const embeddedModuleAnalysis = pickEmbeddedModuleAnalysisFromSubmit(o, layers)
  const embeddedOverall = pickEmbeddedOverallAnalysisFromSubmit(o, layers)
  const maxScoreNum = toFiniteNumber(o.maxScore ?? o.max_score) ?? 0
  const pctRaw = o.percentile ?? o.percentileRank ?? o.percentile_rank
  const attemptPercentile =
    pctRaw !== null && pctRaw !== undefined && pctRaw !== '' ? toFiniteNumber(pctRaw) : undefined
  const modAgg = embeddedModuleAnalysis && embeddedModuleAnalysis.length > 0 ? embeddedModuleAnalysis : undefined
  return {
    id: String(o.id ?? attemptId),
    tryoutId: tryoutIdRaw != null ? String(tryoutIdRaw) : undefined,
    tryoutTitle:
      o.tryoutTitle != null ? String(o.tryoutTitle) : (o.tryout_title != null ? String(o.tryout_title) : undefined),
    status: o.status != null ? String(o.status) : undefined,
    score: toFiniteNumber(o.score),
    maxScore: maxScoreNum,
    ...(attemptPercentile !== undefined ? { percentile: attemptPercentile } : {}),
    timeSecondsSpent: toFiniteNumber(o.timeSecondsSpent ?? o.time_seconds_spent),
    startedAt: o.startedAt != null ? String(o.startedAt) : (o.started_at != null ? String(o.started_at) : undefined),
    submittedAt:
      o.submittedAt != null ? String(o.submittedAt) : (o.submitted_at != null ? String(o.submitted_at) : undefined),
    ...(embeddedReview && embeddedReview.length > 0 ? { review: embeddedReview } : {}),
    ...(modAgg ? { moduleAnalysis: modAgg, moduleSummary: modAgg } : {}),
    ...(embeddedOverall ? { overallAnalysis: embeddedOverall } : {}),
  }
}

/** GET /tryouts/:tryoutId/leaderboard/rank — peringkat + skor user (Bearer wajib) */
export async function getTryoutLeaderboardRank(tryoutId: string): Promise<TryoutLeaderboardRankResponse | null> {
  const res = await apiFetch(`${API_BASE}/tryouts/${encodeURIComponent(tryoutId)}/leaderboard/rank`, {
    headers: authHeaders(),
  })
  if (res.status === 401 || res.status === 404) return null
  if (res.status === 403) return null
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const technical = extractApiErrorMessage(data, res.statusText)
    recordHttpApiFailure(res, data, { method: 'GET', message: technical })
    throw new ApiError(res.status, getUserFacingHttpMessage(res.status), data as ApiError['data'])
  }
  const o =
    data.data != null && typeof data.data === 'object' && !Array.isArray(data.data)
      ? (data.data as Record<string, unknown>)
      : data
  const inLbRaw = o.inLeaderboard ?? o.in_leaderboard
  if (inLbRaw === false) {
    return { inLeaderboard: false }
  }
  const rank = toInt(o.rank ?? o.position)
  const score = parseLeaderboardRowScore(o)
  const pctRaw = o.percentile ?? o.percentileRank ?? o.percentile_rank
  const percentile =
    typeof pctRaw === 'number' && Number.isFinite(pctRaw)
      ? pctRaw
      : (typeof pctRaw === 'string' && pctRaw.trim() ? Number(pctRaw) : undefined)
  return {
    inLeaderboard: inLbRaw === true ? true : undefined,
    rank: rank ?? undefined,
    score: score ?? undefined,
    percentile: percentile != null && Number.isFinite(percentile) ? percentile : undefined,
  }
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
  const root = (await handleResponse<Record<string, unknown>>(res)) as Record<string, unknown>
  const nested =
    root.data != null && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null
  /** Banyak backend membungkus body di `{ data: { ... } }` — baca dari nested dulu. */
  const layers: Record<string, unknown>[] = nested ? [nested, root] : [root]
  let examUrl: string | undefined
  let attemptId: string | undefined
  let expiresAt: string | undefined
  let timeLeftSeconds: number | undefined
  for (const o of layers) {
    if (!examUrl) {
      const examRaw =
        o.examUrl ??
        o.exam_url ??
        o.url ??
        o.exam_link ??
        o.redirectUrl ??
        o.redirect_url
      if (typeof examRaw === 'string' && examRaw.trim()) examUrl = examRaw.trim()
    }
    if (!attemptId) {
      const attemptRaw = o.attemptId ?? o.attempt_id
      if (typeof attemptRaw === 'string' && attemptRaw.trim()) attemptId = attemptRaw.trim()
      else if (attemptRaw != null && String(attemptRaw).trim()) attemptId = String(attemptRaw).trim()
    }
    if (!expiresAt) {
      const ex = o.expiresAt ?? o.expires_at
      if (typeof ex === 'string' && ex.trim()) expiresAt = ex.trim()
    }
    if (timeLeftSeconds == null) {
      const tl = o.timeLeftSeconds ?? o.time_left_seconds ?? o.timeLeft
      if (typeof tl === 'number' && Number.isFinite(tl)) timeLeftSeconds = Math.max(0, Math.trunc(tl))
      else if (typeof tl === 'string' && tl.trim()) {
        const n = Number(tl)
        if (Number.isFinite(n)) timeLeftSeconds = Math.max(0, Math.trunc(n))
      }
    }
  }
  return { ...root, examUrl, attemptId, expiresAt, timeLeftSeconds } satisfies TryoutStartResponse
}

/**
 * Mulai tryout: utama POST /student/tryouts/:id/start; fallback POST /tryouts/:id/start (alur fansedu-lms).
 */
export async function startStudentTryoutWithFallback(tryoutId: string): Promise<TryoutStartResponse> {
  try {
    return await startStudentTryout(tryoutId)
  } catch (e) {
    if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 405)) throw e
    const res = await apiFetch(`${API_BASE}/tryouts/${encodeURIComponent(tryoutId)}/start`, {
      method: 'POST',
      headers: authHeaders(),
    })
    const root = (await handleResponse<Record<string, unknown>>(res)) as Record<string, unknown>
    const nested =
      root.data != null && typeof root.data === 'object' && !Array.isArray(root.data)
        ? (root.data as Record<string, unknown>)
        : null
    const layers: Record<string, unknown>[] = nested ? [nested, root] : [root]
    let examUrl: string | undefined
    let attemptId: string | undefined
    let expiresAt: string | undefined
    let timeLeftSeconds: number | undefined
    for (const o of layers) {
      if (!examUrl) {
        const examRaw =
          o.examUrl ??
          o.exam_url ??
          o.url ??
          o.exam_link ??
          o.redirectUrl ??
          o.redirect_url
        if (typeof examRaw === 'string' && examRaw.trim()) examUrl = examRaw.trim()
      }
      if (!attemptId) {
        const attemptRaw = o.attemptId ?? o.attempt_id
        if (typeof attemptRaw === 'string' && attemptRaw.trim()) attemptId = attemptRaw.trim()
        else if (attemptRaw != null && String(attemptRaw).trim()) attemptId = String(attemptRaw).trim()
      }
      if (!expiresAt) {
        const ex = o.expiresAt ?? o.expires_at
        if (typeof ex === 'string' && ex.trim()) expiresAt = ex.trim()
      }
      if (timeLeftSeconds == null) {
        const tl = o.timeLeftSeconds ?? o.time_left_seconds ?? o.timeLeft
        if (typeof tl === 'number' && Number.isFinite(tl)) timeLeftSeconds = Math.max(0, Math.trunc(tl))
        else if (typeof tl === 'string' && tl.trim()) {
          const n = Number(tl)
          if (Number.isFinite(n)) timeLeftSeconds = Math.max(0, Math.trunc(n))
        }
      }
    }
    return { ...root, examUrl, attemptId, expiresAt, timeLeftSeconds } satisfies TryoutStartResponse
  }
}

function buildMockTryoutAttemptPaper(): TryoutAttemptPaper {
  const sampleQs = tryoutExamSampleExport.questions as Array<{
    id: string
    order?: number
    prompt: string
    questionType?: string
    options: { key: string; label: string }[]
    tags?: string[]
  }>
  return {
    title: 'Tryout (mode demo lokal)',
    durationMinutes: 60,
    questions: sampleQs.map((q, i) => {
      const mod = extractModuleFromPayload(q as unknown as Record<string, unknown>)
      return {
        id: q.id,
        order: q.order ?? i + 1,
        prompt: q.prompt,
        questionType: 'multiple_choice' as const,
        options: q.options,
        ...(mod ? { moduleKey: mod.moduleKey, moduleLabel: mod.moduleLabel } : {}),
      }
    }),
  }
}

function parseOptionsField(raw: unknown): { key: string; label: string }[] {
  if (Array.isArray(raw)) {
    return raw.map((o, i) => {
      if (typeof o === 'string' && o.trim()) {
        const key = String.fromCharCode(65 + Math.min(i, 25))
        return { key, label: o.trim() }
      }
      if (o != null && typeof o === 'object' && !Array.isArray(o)) {
        const r = o as Record<string, unknown>
        const key = String(r.key ?? r.id ?? r.code ?? String.fromCharCode(65 + Math.min(i, 25)))
        const label = String(r.label ?? r.text ?? r.content ?? r.value ?? key)
        return { key, label }
      }
      return { key: String(i + 1), label: String(o) }
    })
  }
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    return Object.entries(o).map(([key, val]) => ({ key, label: String(val) }))
  }
  return []
}

function optionsFromQuestionItem(item: Record<string, unknown>): { key: string; label: string }[] {
  const parsed = parseOptionsField(
    item.options ??
      item.choices ??
      item.pilihan ??
      item.answer_options ??
      item.alternatives,
  )
  if (parsed.length >= 2) return parsed
  const letters = ['A', 'B', 'C', 'D', 'E'] as const
  const out: { key: string; label: string }[] = []
  for (const L of letters) {
    const snake = `option_${L.toLowerCase()}`
    const v =
      item[snake] ??
      item[`option${L}`] ??
      item[L.toLowerCase()] ??
      item[L]
    if (typeof v === 'string' && v.trim()) out.push({ key: L, label: v.trim() })
  }
  return out
}

function normalizeTagsField(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    const out = raw
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim())
    return out.length ? out : undefined
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw) as unknown
      if (Array.isArray(p)) {
        const out = p
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          .map((t) => t.trim())
        return out.length ? out : undefined
      }
    } catch {
      /* bukan JSON array */
    }
  }
  return undefined
}

function detectQuestionType(item: Record<string, unknown>): 'multiple_choice' | 'short' | 'true_false' {
  const raw = String(item.type ?? item.question_type ?? item.questionType ?? '')
    .toLowerCase()
    .replace(/-/g, '_')
  if (raw === 'short' || raw === 'essay' || raw === 'fill' || raw === 'isian') return 'short'
  if (raw === 'true_false' || raw === 'boolean' || raw === 'benar_salah') return 'true_false'
  if (raw === 'multiple_choice' || raw === 'mcq' || raw === 'pilihan_ganda') return 'multiple_choice'
  const opts = optionsFromQuestionItem(item)
  if (opts.length === 0) return 'short'
  return 'multiple_choice'
}

function normalizeTryoutExamQuestion(item: Record<string, unknown>, index: number): TryoutExamQuestion | null {
  const id = String(item.id ?? item.question_id ?? item.questionId ?? `q-${index + 1}`)
  const sortOrderRaw =
    item.sortOrder ?? item.sort_order ?? item.order ?? item.number ?? item.question_number ?? item.questionNumber
  let orderNum = index + 1
  if (typeof sortOrderRaw === 'number' && Number.isFinite(sortOrderRaw)) orderNum = Math.max(1, Math.trunc(sortOrderRaw))
  else if (typeof sortOrderRaw === 'string' && sortOrderRaw.trim()) {
    const n = Number(sortOrderRaw.trim())
    if (Number.isFinite(n)) orderNum = Math.max(1, Math.trunc(n))
  }
  const questionType = detectQuestionType(item)
  const bodyRaw = item.body ?? item.stem ?? item.stem_html
  const bodyStr = typeof bodyRaw === 'string' ? bodyRaw : ''
  const bodyHtml = bodyStr && /<[a-z][\s\S]*>/i.test(bodyStr) ? bodyStr : undefined
  const prompt = String(
    item.prompt ??
      item.text ??
      item.statement ??
      item.question_text ??
      item.questionText ??
      (!bodyHtml && bodyStr ? bodyStr : '') ??
      item.question ??
      item.soal ??
      item.title ??
      '',
  ).trim()
  if (!prompt && !bodyHtml) return null

  let options = optionsFromQuestionItem(item)
  if (questionType === 'true_false' && options.length < 2) {
    options = [
      { key: 'Benar', label: 'Benar' },
      { key: 'Salah', label: 'Salah' },
    ]
  }
  if (questionType === 'short') {
    options = []
  }
  if (questionType === 'multiple_choice' && options.length < 2) return null

  const imageUrlsFirst = (() => {
    const arr = item.imageUrls ?? item.image_urls
    if (!Array.isArray(arr)) return null
    for (const u of arr) {
      if (typeof u === 'string' && u.trim()) return u.trim()
    }
    return null
  })()
  const imageUrl =
    (typeof item.image_url === 'string' && item.image_url) ||
    (typeof item.imageUrl === 'string' && item.imageUrl) ||
    imageUrlsFirst

  const savedRaw =
    item.selectedOption ??
    item.selected_option ??
    item.savedOption ??
    item.userAnswer ??
    item.user_answer
  const savedSelectedOption =
    typeof savedRaw === 'string' && savedRaw.trim() ? savedRaw.trim() : undefined
  const atRaw = item.answerText ?? item.answer_text
  const savedAnswerText = typeof atRaw === 'string' && atRaw.trim() ? atRaw.trim() : undefined

  const mod = extractModuleFromPayload(item)
  const bidangRaw = item.bidang
  const bidang = typeof bidangRaw === 'string' && bidangRaw.trim() ? bidangRaw.trim() : undefined
  const tags = normalizeTagsField(item.tags)

  return {
    id,
    order: orderNum,
    prompt,
    bodyHtml,
    imageUrl,
    questionType,
    options,
    savedSelectedOption,
    savedAnswerText,
    ...(mod ? { moduleKey: mod.moduleKey, moduleLabel: mod.moduleLabel } : {}),
    ...(bidang ? { bidang } : {}),
    ...(tags?.length ? { tags } : {}),
  }
}

function extractTryoutQuestionsArray(root: Record<string, unknown>): Record<string, unknown>[] {
  const nested =
    root.data != null && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null
  const seen = new Set<Record<string, unknown>>()
  const layers: Record<string, unknown>[] = []
  const push = (o: Record<string, unknown>) => {
    if (seen.has(o)) return
    seen.add(o)
    layers.push(o)
  }
  push(root)
  if (nested) push(nested)
  let i = 0
  while (i < layers.length) {
    const layer = layers[i++]
    for (const subKey of ['paper', 'exam', 'attempt', 'content', 'payload', 'examPaper', 'exam_paper']) {
      const sub = layer[subKey]
      if (sub && typeof sub === 'object' && !Array.isArray(sub)) push(sub as Record<string, unknown>)
    }
  }
  const keys = ['questions', 'items', 'problems', 'problem_set', 'soal', 'bank', 'question_list', 'questionList']
  for (const layer of layers) {
    for (const k of keys) {
      const v = layer[k]
      if (Array.isArray(v) && v.length > 0) return v as Record<string, unknown>[]
    }
  }
  return []
}

function parseDurationMinutesFromPayload(o: Record<string, unknown>): number | undefined {
  const raw =
    o.durationMinutes ??
    o.duration_minutes ??
    o.timeLimitMinutes ??
    o.time_limit_minutes ??
    o.timeLimit ??
    o.time_limit ??
    o.duration
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(1, Math.trunc(raw))
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw)
    if (Number.isFinite(n)) return Math.max(1, Math.trunc(n))
  }
  return undefined
}

function parseTimeLeftSecondsFromLayer(o: Record<string, unknown>): number | undefined {
  const tl = o.timeLeftSeconds ?? o.time_left_seconds ?? o.timeRemainingSeconds ?? o.time_remaining_seconds
  if (typeof tl === 'number' && Number.isFinite(tl)) return Math.max(0, Math.trunc(tl))
  if (typeof tl === 'string' && tl.trim()) {
    const n = Number(tl)
    if (Number.isFinite(n)) return Math.max(0, Math.trunc(n))
  }
  return undefined
}

function parseTryoutAttemptPaperPayload(raw: Record<string, unknown>): TryoutAttemptPaper {
  const nested =
    raw.data != null && typeof raw.data === 'object' && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : null
  const layers: Record<string, unknown>[] = nested ? [nested, raw] : [raw]
  let title: string | undefined
  let endsAt: string | undefined
  let durationMinutes = 60
  let timeLeftSeconds: number | undefined
  for (const o of layers) {
    if (!title) {
      const t = o.title ?? o.tryoutTitle ?? o.tryout_title ?? o.name
      if (typeof t === 'string' && t.trim()) title = t.trim()
    }
    if (!endsAt) {
      const e = o.endsAt ?? o.ends_at ?? o.expiresAt ?? o.expires_at ?? o.deadlineAt ?? o.deadline_at
      if (typeof e === 'string' && e.trim()) endsAt = e.trim()
    }
    const dm = parseDurationMinutesFromPayload(o)
    if (dm != null) durationMinutes = dm
    const tls = parseTimeLeftSecondsFromLayer(o)
    if (tls != null) timeLeftSeconds = tls
  }
  const items = extractTryoutQuestionsArray(raw)
  const questions = items
    .map((item, idx) => normalizeTryoutExamQuestion(item, idx))
    .filter((q): q is TryoutExamQuestion => q != null)
    .sort((a, b) => a.order - b.order)
  return { title, durationMinutes, endsAt, timeLeftSeconds, questions }
}

/**
 * Parse respons GET paper/questions (format sama untuk siswa & guru) ke bentuk internal.
 * Berguna untuk mengisi editor impor JSON / validasi sebelum PUT.
 */
export function parseTryoutPaperFromApiResponse(raw: unknown): TryoutAttemptPaper {
  const root: Record<string, unknown> =
    Array.isArray(raw)
      ? { questions: raw }
      : raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {}
  return parseTryoutAttemptPaperPayload(root)
}

function buildGuruTryoutPaperPutBody(paper: TryoutAttemptPaper): Record<string, unknown> {
  return {
    title: paper.title ?? '',
    duration_minutes: paper.durationMinutes,
    ends_at: paper.endsAt ?? undefined,
    time_left_seconds: paper.timeLeftSeconds,
    questions: paper.questions.map((q, i) => ({
      id: q.id,
      order: q.order ?? i + 1,
      type: q.questionType,
      question_type: q.questionType,
      prompt: q.prompt,
      body: q.bodyHtml ?? undefined,
      body_html: q.bodyHtml ?? undefined,
      image_url: q.imageUrl ?? undefined,
      options: q.options.map((o) => ({ key: o.key, label: o.label })),
      ...(q.moduleKey ? { module_id: q.moduleKey, module_key: q.moduleKey } : {}),
      ...(q.moduleLabel ? { module_title: q.moduleLabel, module_name: q.moduleLabel } : {}),
      ...(q.bidang ? { bidang: q.bidang } : {}),
      ...(q.tags?.length ? { tags: q.tags } : {}),
    })),
  }
}

/**
 * Ambil draf lembar soal untuk diedit (guru/admin). Mencoba beberapa path umum; `null` jika semua 404.
 * Path: GET .../guru|instructor|admin/tryouts/:id/paper
 */
export async function fetchGuruTryoutPaperDraft(tryoutId: string): Promise<TryoutAttemptPaper | null> {
  const urls = [
    `${API_BASE}/guru/tryouts/${encodeURIComponent(tryoutId)}/paper`,
    `${API_BASE}/instructor/tryouts/${encodeURIComponent(tryoutId)}/paper`,
    `${API_BASE}/admin/tryouts/${encodeURIComponent(tryoutId)}/paper`,
  ]
  for (const url of urls) {
    const res = await apiFetch(url, { headers: authHeaders() })
    if (res.status === 404) continue
    const data = await handleResponse<unknown>(res)
    return parseTryoutPaperFromApiResponse(data)
  }
  return null
}

/**
 * Simpan definisi lembar + soal ke backend (guru/admin). Body menggabungkan camelCase + snake_case umum.
 * Mencoba PUT lalu POST pada path yang sama bila 405. Jika semua gagal → ApiError 404.
 */
export async function saveGuruTryoutPaperToApi(tryoutId: string, paper: TryoutAttemptPaper): Promise<void> {
  const json = JSON.stringify(buildGuruTryoutPaperPutBody(paper))
  const urls = [
    `${API_BASE}/guru/tryouts/${encodeURIComponent(tryoutId)}/paper`,
    `${API_BASE}/instructor/tryouts/${encodeURIComponent(tryoutId)}/paper`,
    `${API_BASE}/admin/tryouts/${encodeURIComponent(tryoutId)}/paper`,
  ]
  const methods = ['PUT', 'POST'] as const
  for (const url of urls) {
    for (const method of methods) {
      const res = await apiFetch(url, {
        method,
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: json,
      })
      if (res.status === 404 || res.status === 405) continue
      await handleResponse<void>(res)
      return
    }
  }
  throw new ApiError(
    404,
    'Tidak dapat menyimpan lembar saat ini. Silakan coba lagi nanti atau hubungi admin.',
    {},
  )
}

/** Respons GET /attempts/:attemptId/questions (atau array mentah). */
function parseAttemptQuestionsPayload(raw: unknown): TryoutAttemptPaper {
  const root: Record<string, unknown> =
    Array.isArray(raw)
      ? { questions: raw }
      : raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {}
  return parseTryoutAttemptPaperPayload(root)
}

/**
 * GET /attempts/:attemptId/questions — daftar soal untuk pengerjaan di client (Bearer siswa).
 */
export async function getAttemptQuestions(attemptId: string): Promise<TryoutAttemptPaper> {
  if (import.meta.env.VITE_TRYOUT_EXAM_MOCK === 'true') {
    return buildMockTryoutAttemptPaper()
  }
  const res = await apiFetch(`${API_BASE}/attempts/${encodeURIComponent(attemptId)}/questions`, {
    headers: authHeaders(),
  })
  const data = await handleResponse<unknown>(res)
  const paper = parseAttemptQuestionsPayload(data)
  if (paper.questions.length === 0) {
    throw new ApiError(404, 'Daftar soal kosong.', {})
  }
  return paper
}

/**
 * PUT /attempts/:attemptId/answers/:questionId
 */
export async function putAttemptAnswer(
  attemptId: string,
  questionId: string,
  body: PutAttemptAnswerBody,
): Promise<void> {
  if (import.meta.env.VITE_TRYOUT_EXAM_MOCK === 'true') return
  /** Backend Go: AnswerPutRequest memakai json camelCase (selectedOption, answerText, isMarked). */
  const payload: Record<string, unknown> = {}
  if (body.answerText != null && body.answerText !== '') payload.answerText = body.answerText
  if (body.selectedOption != null && body.selectedOption !== '') payload.selectedOption = body.selectedOption
  if (body.isMarked !== undefined) payload.isMarked = body.isMarked
  const res = await apiFetch(
    `${API_BASE}/attempts/${encodeURIComponent(attemptId)}/answers/${encodeURIComponent(questionId)}`,
    {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    },
  )
  await handleResponse<void>(res)
}

/**
 * POST /attempts/:attemptId/submit — jawaban sudah disimpan per soal lewat PUT answers.
 */
export async function submitTryoutAttempt(attemptId: string): Promise<TryoutAttemptSubmitResult> {
  if (import.meta.env.VITE_TRYOUT_EXAM_MOCK === 'true') {
    return {
      maxScore: 0,
      message: 'Terima kasih — mode demo: submit lokal.',
      submittedAt: new Date().toISOString(),
    }
  }
  const res = await apiFetch(`${API_BASE}/attempts/${encodeURIComponent(attemptId)}/submit`, {
    method: 'POST',
    headers: authHeaders(),
  })
  const data = await handleResponse<Record<string, unknown>>(res)
  return parseTryoutSubmitResultPayload(data)
}

function parseAttemptReviewRowsFromPayload(raw: unknown): TryoutAttemptReviewRow[] {
  const pickArray = (o: Record<string, unknown>): unknown[] | null => {
    const keys = [
      'items',
      'questions',
      'breakdown',
      'results',
      'rows',
      'review',
      'outcomes',
      'questionReviewOutcomes',
      'question_review_outcomes',
    ]
    for (const k of keys) {
      const v = o[k]
      if (Array.isArray(v) && v.length > 0) return v
    }
    return null
  }
  let arr: unknown[] = []
  if (Array.isArray(raw)) arr = raw
  else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const root = raw as Record<string, unknown>
    const nested =
      root.data != null && typeof root.data === 'object' && !Array.isArray(root.data)
        ? (root.data as Record<string, unknown>)
        : null
    const fromNested = nested ? pickArray(nested) : null
    const fromRoot = pickArray(root)
    arr = fromNested ?? fromRoot ?? []
  }
  const out: TryoutAttemptReviewRow[] = []
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const o = item as Record<string, unknown>
    const questionId = String(o.questionId ?? o.question_id ?? o.id ?? `row-${i}`)
    const orderRaw = o.order ?? o.number ?? o.question_number ?? o.questionNumber
    const order =
      typeof orderRaw === 'number' && Number.isFinite(orderRaw)
        ? Math.trunc(orderRaw)
        : (typeof orderRaw === 'string' && orderRaw.trim() ? Math.trunc(Number(orderRaw)) : undefined)
    const prompt =
      typeof o.prompt === 'string'
        ? o.prompt
        : (typeof o.stem === 'string' ? o.stem : (typeof o.text === 'string' ? o.text : undefined))
    const yourAnswer = String(
      o.yourAnswer ?? o.your_answer ?? o.userAnswer ?? o.user_answer ?? o.selectedAnswer ?? '',
    ).trim()
    const correctAnswer = String(
      o.correctAnswer ?? o.correct_answer ?? o.answerKey ?? o.answer_key ?? '',
    ).trim()
    const explanation = String(o.explanation ?? o.pembahasan ?? o.rationale ?? '').trim()
    const ic =
      Object.prototype.hasOwnProperty.call(o, 'isCorrect')
        ? o.isCorrect
        : Object.prototype.hasOwnProperty.call(o, 'is_correct')
          ? o.is_correct
          : undefined
    let isCorrect: boolean | null | undefined
    if (ic === null) isCorrect = null
    else if (typeof ic === 'boolean') isCorrect = ic
    else if (ic === 1 || ic === '1' || ic === 'true') isCorrect = true
    else if (ic === 0 || ic === '0' || ic === 'false') isCorrect = false
    const rowMod = extractModuleFromPayload(o)
    const mk = String(o.moduleKey ?? o.module_key ?? '').trim()
    const ml = String(o.moduleLabel ?? o.module_label ?? '').trim()
    const mid = String(o.moduleId ?? o.module_id ?? '').trim()
    const mt = String(o.moduleTitle ?? o.module_title ?? '').trim()
    const bid = typeof o.bidang === 'string' && o.bidang.trim() ? o.bidang.trim() : undefined
    const tags = normalizeTagsField(o.tags)
    const questionTypeLabel = String(
      o.questionTypeLabel ?? o.question_type_label ?? o.questionType ?? '',
    ).trim()
    const analysisSummary = String(o.analysisSummary ?? o.analysis_summary ?? '').trim()
    const analysisDetail = String(o.analysisDetail ?? o.analysis_detail ?? '').trim()
    const scoreGot = tryParseNumberField(o.scoreGot ?? o.score_got ?? o.pointsEarned ?? o.points_earned)
    const rowMaxScore = tryParseNumberField(o.maxScore ?? o.max_score ?? o.questionMaxScore ?? o.question_max_score)
    const modKeyOut = mk || rowMod?.moduleKey
    const modLabelOut = ml || rowMod?.moduleLabel
    out.push({
      questionId,
      ...(modKeyOut ? { moduleKey: modKeyOut } : {}),
      ...(modLabelOut ? { moduleLabel: modLabelOut } : {}),
      ...(mid ? { moduleId: mid } : {}),
      ...(mt ? { moduleTitle: mt } : {}),
      ...(bid ? { bidang: bid } : {}),
      ...(tags?.length ? { tags } : {}),
      ...(questionTypeLabel ? { questionTypeLabel } : {}),
      ...(analysisSummary ? { analysisSummary } : {}),
      ...(analysisDetail ? { analysisDetail } : {}),
      ...(scoreGot !== undefined ? { scoreGot } : {}),
      ...(rowMaxScore !== undefined ? { maxScore: rowMaxScore } : {}),
      ...(order != null && Number.isFinite(order) ? { order } : {}),
      ...(prompt ? { prompt } : {}),
      ...(yourAnswer ? { yourAnswer } : {}),
      ...(correctAnswer ? { correctAnswer } : {}),
      ...(explanation ? { explanation } : {}),
      ...(isCorrect !== undefined || ic === null ? { isCorrect: isCorrect ?? null } : {}),
    })
  }
  return out
}

/**
 * Pembahasan / kunci per soal setelah submit. Mencoba beberapa path; `null` jika tidak ada data.
 */
export async function fetchTryoutAttemptReview(attemptId: string): Promise<TryoutAttemptReviewRow[] | null> {
  if (import.meta.env.VITE_TRYOUT_EXAM_MOCK === 'true') return null
  const urls = [
    `${API_BASE}/attempts/${encodeURIComponent(attemptId)}/review`,
    `${API_BASE}/attempts/${encodeURIComponent(attemptId)}/breakdown`,
    `${API_BASE}/student/attempts/${encodeURIComponent(attemptId)}/review`,
  ]
  for (const url of urls) {
    try {
      const res = await apiFetch(url, { headers: authHeaders() })
      if (res.status === 404) continue
      const data = await handleResponse<unknown>(res)
      const rows = parseAttemptReviewRowsFromPayload(data)
      if (rows.length > 0) return rows
    } catch {
      continue
    }
  }
  return null
}

/**
 * Parse respons paper siswa: array QuestionResponse mentah atau objek berisi `questions`.
 */
function parseStudentPaperResponsePayload(payload: unknown): TryoutAttemptPaper {
  if (Array.isArray(payload)) return parseAttemptQuestionsPayload(payload)
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return parseTryoutAttemptPaperPayload(payload as Record<string, unknown>)
  }
  return parseTryoutAttemptPaperPayload({})
}

/**
 * Lembar soal: sesuai router siswa GET …/student/tryouts/:id/attempts/:attemptId/paper (bisa array mentah),
 * lalu fallback GET /attempts/:attemptId/questions.
 */
export async function getStudentTryoutAttemptPaper(
  tryoutId: string,
  attemptId: string,
): Promise<TryoutAttemptPaper> {
  if (import.meta.env.VITE_TRYOUT_EXAM_MOCK === 'true') {
    return buildMockTryoutAttemptPaper()
  }
  const base = `${API_BASE}/student/tryouts/${encodeURIComponent(tryoutId)}/attempts/${encodeURIComponent(attemptId)}`
  for (const url of [`${base}/paper`, base]) {
    const res = await apiFetch(url, { headers: authHeaders() })
    if (res.status === 404 || res.status === 405) continue
    try {
      const payload = await handleResponse<unknown>(res)
      const paper = parseStudentPaperResponsePayload(payload)
      if (paper.questions.length > 0) return paper
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 405)) continue
      throw e
    }
  }
  return getAttemptQuestions(attemptId)
}

function tryParseNumberField(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.trim())
    if (Number.isFinite(n)) return n
  }
  return undefined
}

/** Lapisan objek dari respons submit (root, data, result, grading, …) untuk membaca skor yang sering bersarang. */
function flattenTryoutSubmitPayloadLayers(raw: Record<string, unknown>): Record<string, unknown>[] {
  const seen = new Set<Record<string, unknown>>()
  const out: Record<string, unknown>[] = []
  const walk = (o: Record<string, unknown>) => {
    if (seen.has(o)) return
    seen.add(o)
    out.push(o)
    const data = o.data
    if (data && typeof data === 'object' && !Array.isArray(data)) walk(data as Record<string, unknown>)
    for (const key of [
      'result',
      'attempt',
      'grading',
      'gradingResult',
      'grading_result',
      'payload',
      'submission',
      'summary',
      'tryoutSubmitAnalysis',
      'submitAnalysis',
      'analysis',
    ]) {
      const inner = o[key]
      if (inner && typeof inner === 'object' && !Array.isArray(inner)) walk(inner as Record<string, unknown>)
    }
  }
  walk(raw)
  return out
}

function scoreFromSubmitLayer(o: Record<string, unknown>): number | undefined {
  const keys = [
    'score',
    'totalScore',
    'total_score',
    'points',
    'finalScore',
    'final_score',
    'obtainedScore',
    'obtained_score',
    'rawScore',
    'raw_score',
    'earnedScore',
    'earned_score',
  ] as const
  for (const k of keys) {
    const v = tryParseNumberField(o[k])
    if (v !== undefined) return v
  }
  return undefined
}

function parseFeedbackFromLayer(o: Record<string, unknown>): string | undefined {
  const fb = o.feedback ?? o.feedbackText ?? o.feedback_text
  if (typeof fb === 'string' && fb.trim()) return fb.trim()
  if (fb != null && typeof fb === 'object' && !Array.isArray(fb)) {
    const f = fb as Record<string, unknown>
    const parts: string[] = []
    const sum = f.summary ?? f.recap
    if (typeof sum === 'string' && sum.trim()) parts.push(sum.trim())
    const strengths = f.strength_areas ?? f.strengthAreas
    if (Array.isArray(strengths) && strengths.length)
      parts.push(`Kekuatan: ${strengths.map(String).join('; ')}`)
    const impr = f.improvement_areas ?? f.improvementAreas
    if (Array.isArray(impr) && impr.length) parts.push(`Perlu ditingkatkan: ${impr.map(String).join('; ')}`)
    const rec = f.recommendation_text ?? f.recommendationText
    if (typeof rec === 'string' && rec.trim()) parts.push(rec.trim())
    if (parts.length) return parts.join('\n\n')
  }
  return undefined
}

function parseModuleAnalysisAggList(raw: unknown): TryoutModuleStat[] | null {
  let arr: unknown[] = []
  if (Array.isArray(raw)) arr = raw
  else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    const nest = o.modules ?? o.items ?? o.rows ?? o.aggregates ?? o.moduleBreakdown
    if (Array.isArray(nest) && nest.length > 0) arr = nest
  }
  if (arr.length === 0) return null
  const out: TryoutModuleStat[] = []
  for (const item of arr) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const x = item as Record<string, unknown>
    const keyFromBe = String(x.moduleKey ?? x.module_key ?? '').trim()
    const labelFromBe = String(x.moduleLabel ?? x.module_label ?? '').trim()
    const moduleId = String(x.moduleId ?? x.module_id ?? '').trim()
    const moduleTitle = String(x.moduleTitle ?? x.module_title ?? x.bidang ?? '').trim()
    const label = labelFromBe || moduleTitle || moduleId || 'Umum'
    const slug =
      keyFromBe ||
      moduleId ||
      label
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/gi, '') ||
      '__general__'
    const total =
      tryParseNumberField(
        x.questionCount ??
          x.question_count ??
          x.totalCount ??
          x.total ??
          x.totalQuestions ??
          x.jumlah_soal,
      ) ?? 0
    let correct = tryParseNumberField(x.correctCount ?? x.correct ?? x.benar ?? x.jumlah_benar) ?? 0
    let wrong = tryParseNumberField(x.wrongCount ?? x.wrong ?? x.salah ?? x.jumlah_salah) ?? 0
    let unknown =
      tryParseNumberField(
        x.unscoredCount ??
          x.ungradedCount ??
          x.unknown ??
          x.belumDinilai ??
          x.belum_dinilai ??
          x.pending_count ??
          x.pending,
      ) ?? 0
    if (total <= 0 && (correct > 0 || wrong > 0 || unknown > 0)) {
      const sum = correct + wrong + unknown
      out.push({
        moduleKey: slug,
        moduleLabel: label,
        total: sum,
        correct,
        wrong,
        unknown,
      })
      continue
    }
    if (total > 0 && unknown === 0 && correct + wrong < total) {
      unknown = Math.max(0, total - correct - wrong)
    }
    const effTotal = total > 0 ? total : correct + wrong + unknown
    out.push({
      moduleKey: slug,
      moduleLabel: label,
      total: effTotal,
      correct,
      wrong,
      unknown,
    })
  }
  return out.length > 0 ? out : null
}

function pickEmbeddedReviewFromSubmit(
  raw: Record<string, unknown>,
  layers: Record<string, unknown>[],
): TryoutAttemptReviewRow[] | undefined {
  const tryArr = (v: unknown): TryoutAttemptReviewRow[] | undefined => {
    if (v == null) return undefined
    const rows = parseAttemptReviewRowsFromPayload(v)
    return rows.length > 0 ? rows : undefined
  }
  const candidates: unknown[] = [
    raw.review,
    raw.outcomes,
    raw.questionReviewOutcomes,
    raw.question_review_outcomes,
  ]
  for (const layer of layers) {
    candidates.push(
      layer.review,
      layer.outcomes,
      layer.questionReviewOutcomes,
      layer.question_review_outcomes,
    )
  }
  for (const c of candidates) {
    const parsed = tryArr(c)
    if (parsed) return parsed
  }
  return undefined
}

function pickEmbeddedModuleAnalysisFromSubmit(
  raw: Record<string, unknown>,
  layers: Record<string, unknown>[],
): TryoutModuleStat[] | undefined {
  const keys = ['moduleAnalysis', 'module_summary', 'moduleSummary', 'moduleSummaries'] as const
  const candidates: unknown[] = []
  for (const k of keys) candidates.push(raw[k])
  for (const layer of layers) {
    for (const k of keys) candidates.push(layer[k])
  }
  for (const c of candidates) {
    const parsed = parseModuleAnalysisAggList(c)
    if (parsed && parsed.length > 0) return parsed
  }
  return undefined
}

function parseOverallAnalysisByQuestionTypeRow(
  x: Record<string, unknown>,
): TryoutOverallAnalysisByQuestionType | null {
  const questionTypeLabel = String(
    x.questionTypeLabel ?? x.question_type_label ?? x.label ?? '',
  ).trim()
  const total = tryParseNumberField(x.total ?? x.count)
  const correct = tryParseNumberField(x.correct ?? x.correctCount ?? x.correct_count)
  const wrong = tryParseNumberField(x.wrong ?? x.wrongCount ?? x.wrong_count)
  const unscored = tryParseNumberField(
    x.unscored ?? x.unscoredCount ?? x.unscored_count ?? x.autoUngraded ?? x.auto_ungraded,
  )
  const scoreGot = tryParseNumberField(x.scoreGot ?? x.score_got)
  const maxScore = tryParseNumberField(x.maxScore ?? x.max_score)
  if (
    !questionTypeLabel &&
    total === undefined &&
    correct === undefined &&
    wrong === undefined &&
    unscored === undefined &&
    scoreGot === undefined &&
    maxScore === undefined
  ) {
    return null
  }
  return {
    ...(questionTypeLabel ? { questionTypeLabel } : {}),
    ...(total !== undefined ? { total: Math.max(0, Math.trunc(total)) } : {}),
    ...(correct !== undefined ? { correct: Math.max(0, Math.trunc(correct)) } : {}),
    ...(wrong !== undefined ? { wrong: Math.max(0, Math.trunc(wrong)) } : {}),
    ...(unscored !== undefined ? { unscored: Math.max(0, Math.trunc(unscored)) } : {}),
    ...(scoreGot !== undefined ? { scoreGot } : {}),
    ...(maxScore !== undefined ? { maxScore } : {}),
  }
}

function parseOverallAnalysisPayload(raw: unknown): TryoutOverallAnalysis | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const o = raw as Record<string, unknown>
  const summary = String(
    o.summary ?? o.overallSummary ?? o.overall_summary ?? '',
  ).trim()
  const totalQuestions = tryParseNumberField(
    o.totalQuestions ?? o.total_questions ?? o.questionCount ?? o.question_count,
  )
  const answeredCount = tryParseNumberField(o.answeredCount ?? o.answered_count ?? o.answered)
  const unansweredCount = tryParseNumberField(o.unansweredCount ?? o.unanswered_count ?? o.unanswered)
  const correctCount = tryParseNumberField(o.correctCount ?? o.correct_count ?? o.correct)
  const wrongCount = tryParseNumberField(o.wrongCount ?? o.wrong_count ?? o.wrong)
  const autoUngradedCount = tryParseNumberField(
    o.autoUngradedCount ?? o.auto_ungraded_count ?? o.autoUngraded ?? o.unscoredAuto,
  )
  const scorePercent = tryParseNumberField(
    o.scorePercent ?? o.score_percent ?? o.percentScore ?? o.percent_score,
  )
  const scoreGot = tryParseNumberField(o.scoreGot ?? o.score_got)
  const maxScore = tryParseNumberField(o.maxScore ?? o.max_score)

  let byQuestionType: TryoutOverallAnalysisByQuestionType[] | undefined
  const byQtRaw = o.byQuestionType ?? o.by_question_type
  if (Array.isArray(byQtRaw) && byQtRaw.length > 0) {
    const rows = byQtRaw
      .map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? parseOverallAnalysisByQuestionTypeRow(item as Record<string, unknown>)
          : null,
      )
      .filter((row): row is TryoutOverallAnalysisByQuestionType => row != null)
    if (rows.length > 0) byQuestionType = rows
  }

  const hasAny =
    Boolean(summary) ||
    totalQuestions !== undefined ||
    answeredCount !== undefined ||
    unansweredCount !== undefined ||
    correctCount !== undefined ||
    wrongCount !== undefined ||
    autoUngradedCount !== undefined ||
    scorePercent !== undefined ||
    scoreGot !== undefined ||
    maxScore !== undefined ||
    Boolean(byQuestionType?.length)

  if (!hasAny) return undefined

  const trunc = (n: number) => Math.max(0, Math.trunc(n))
  return {
    ...(summary ? { summary } : {}),
    ...(totalQuestions !== undefined ? { totalQuestions: trunc(totalQuestions) } : {}),
    ...(answeredCount !== undefined ? { answeredCount: trunc(answeredCount) } : {}),
    ...(unansweredCount !== undefined ? { unansweredCount: trunc(unansweredCount) } : {}),
    ...(correctCount !== undefined ? { correctCount: trunc(correctCount) } : {}),
    ...(wrongCount !== undefined ? { wrongCount: trunc(wrongCount) } : {}),
    ...(autoUngradedCount !== undefined ? { autoUngradedCount: trunc(autoUngradedCount) } : {}),
    ...(scorePercent !== undefined ? { scorePercent } : {}),
    ...(scoreGot !== undefined ? { scoreGot } : {}),
    ...(maxScore !== undefined ? { maxScore } : {}),
    ...(byQuestionType ? { byQuestionType } : {}),
  }
}

function pickEmbeddedOverallAnalysisFromSubmit(
  raw: Record<string, unknown>,
  layers: Record<string, unknown>[],
): TryoutOverallAnalysis | undefined {
  const candidates: unknown[] = [raw.overallAnalysis, raw.overall_analysis]
  for (const layer of layers) {
    candidates.push(layer.overallAnalysis, layer.overall_analysis)
  }
  for (const c of candidates) {
    const parsed = parseOverallAnalysisPayload(c)
    if (parsed) return parsed
  }
  return undefined
}

function parseTryoutSubmitResultPayload(raw: Record<string, unknown>): TryoutAttemptSubmitResult {
  const layers = flattenTryoutSubmitPayloadLayers(raw)
  /** Nilai terakhir yang ditemukan di traversal DFS — mengalahkan placeholder 0 di root jika ada skor di objek dalam. */
  let score: number | undefined
  for (const o of layers) {
    const s = scoreFromSubmitLayer(o)
    if (s !== undefined) score = s
  }
  let percentile: number | undefined
  for (const o of layers) {
    const pctRaw = o.percentile ?? o.percentileRank ?? o.percentile_rank
    if (pctRaw === null || pctRaw === undefined || pctRaw === '') continue
    const p = tryParseNumberField(pctRaw)
    if (p !== undefined) percentile = p
  }
  let message: string | undefined
  for (const o of layers) {
    const msg = o.message ?? o.detail
    if (typeof msg === 'string' && msg.trim()) {
      message = msg.trim()
      break
    }
  }
  if (!message) {
    for (const o of layers) {
      const st = o.status
      if (typeof st === 'string' && st.trim()) {
        message = st.trim()
        break
      }
    }
  }
  let submittedAt: string | undefined
  for (const o of layers) {
    if (typeof o.submittedAt === 'string' && o.submittedAt.trim()) {
      submittedAt = o.submittedAt.trim()
      break
    }
    if (typeof o.submitted_at === 'string' && o.submitted_at.trim()) {
      submittedAt = o.submitted_at.trim()
      break
    }
  }
  let feedback: string | undefined
  for (const o of layers) {
    const f = parseFeedbackFromLayer(o)
    if (f) feedback = f
  }
  let graded: boolean | undefined
  for (const o of layers) {
    const g = o.graded ?? o.isGraded ?? o.is_graded
    if (typeof g === 'boolean') graded = g
    else if (g === 1 || g === '1' || g === 'true') graded = true
    else if (g === 0 || g === '0' || g === 'false') graded = false
  }
  let gradingStatus: string | undefined
  for (const o of layers) {
    const gs = o.gradingStatus ?? o.grading_status ?? o.scoringStatus ?? o.scoring_status
    if (typeof gs === 'string' && gs.trim()) {
      gradingStatus = gs.trim()
      break
    }
  }
  let maxScore = 0
  for (const layer of layers) {
    const m = tryParseNumberField(layer.maxScore ?? layer.max_score ?? layer.maxPoints ?? layer.max_points)
    if (m !== undefined && Number.isFinite(m) && m >= 0) maxScore = m
  }
  const embeddedReview = pickEmbeddedReviewFromSubmit(raw, layers)
  const embeddedModuleAnalysis = pickEmbeddedModuleAnalysisFromSubmit(raw, layers)
  const embeddedOverall = pickEmbeddedOverallAnalysisFromSubmit(raw, layers)
  const modAgg = embeddedModuleAnalysis && embeddedModuleAnalysis.length > 0 ? embeddedModuleAnalysis : undefined
  return {
    score: score != null && Number.isFinite(score) ? score : undefined,
    maxScore,
    message,
    submittedAt,
    percentile: percentile != null && Number.isFinite(percentile) ? percentile : undefined,
    feedback,
    graded,
    gradingStatus,
    ...(embeddedReview && embeddedReview.length > 0 ? { review: embeddedReview } : {}),
    ...(modAgg ? { moduleAnalysis: modAgg, moduleSummary: modAgg } : {}),
    ...(embeddedOverall ? { overallAnalysis: embeddedOverall } : {}),
  }
}

/**
 * Submit attempt resmi: POST /attempts/:attemptId/submit (jawaban per soal lewat PUT …/answers/:questionId).
 */
export async function submitStudentTryoutAttempt(
  _tryoutId: string,
  attemptId: string,
  _answers?: Record<string, string>,
): Promise<TryoutAttemptSubmitResult> {
  if (import.meta.env.VITE_TRYOUT_EXAM_MOCK === 'true') {
    const n = _answers ? Object.keys(_answers).filter((k) => _answers[k]?.trim()).length : 0
    return {
      maxScore: 0,
      message: n > 0 ? `Terima kasih — mode demo: ${n} jawaban tercatat lokal.` : 'Terima kasih — mode demo.',
      submittedAt: new Date().toISOString(),
    }
  }
  return submitTryoutAttempt(attemptId)
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
  const root =
    data.data != null && typeof data.data === 'object' && !Array.isArray(data.data)
      ? (data.data as Record<string, unknown>)
      : data

  const toBool = (value: unknown): boolean =>
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true'

  const isRegistered = toBool(
    root.isRegistered ??
    root.is_registered ??
    root.registered ??
    root.has_registered
  )
  const hasAttempted = toBool(
    root.hasAttempted ??
    root.has_attempted ??
    root.hasAttempt ??
    root.has_attempt ??
    root.isCompleted ??
    root.is_completed ??
    root.completed
  )
  const canRetake = toBool(
    root.canRetake ??
    root.can_retake ??
    root.allowRetake ??
    root.allow_retake
  )
  const attemptCountRaw = root.attemptCount ?? root.attempt_count
  const attemptCountNum = typeof attemptCountRaw === 'number'
    ? Math.trunc(attemptCountRaw)
    : (typeof attemptCountRaw === 'string' && attemptCountRaw.trim() ? Math.trunc(Number(attemptCountRaw)) : undefined)

  const lastAttemptRaw = root.lastAttemptId ?? root.last_attempt_id
  const lastAttemptId =
    typeof lastAttemptRaw === 'string' && lastAttemptRaw.trim()
      ? lastAttemptRaw.trim()
      : lastAttemptRaw != null && String(lastAttemptRaw).trim()
        ? String(lastAttemptRaw).trim()
        : undefined

  const opensAtRaw = root.opensAt ?? root.opens_at
  const closesAtRaw = root.closesAt ?? root.closes_at ?? root.closeAt ?? root.close_at
  const tryoutStatusRaw = root.tryoutStatus ?? root.tryout_status ?? root.status
  const startReasonRaw = root.startDisabledReason ?? root.start_disabled_reason

  const canRegRaw = root.canRegister ?? root.can_register
  const canStartRaw = root.canStartExam ?? root.can_start_exam ?? root.canStart ?? root.can_start

  const opensAt = typeof opensAtRaw === 'string' && opensAtRaw.trim() ? opensAtRaw.trim() : undefined
  const closesAt = typeof closesAtRaw === 'string' && closesAtRaw.trim() ? closesAtRaw.trim() : undefined
  const tryoutStatus = typeof tryoutStatusRaw === 'string' && tryoutStatusRaw.trim() ? tryoutStatusRaw.trim() : undefined
  const startDisabledReason =
    typeof startReasonRaw === 'string' && startReasonRaw.trim() ? startReasonRaw.trim() : undefined

  const canRegister = typeof canRegRaw === 'boolean' ? canRegRaw : undefined
  const canStartExam = typeof canStartRaw === 'boolean' ? canStartRaw : undefined

  return {
    isRegistered,
    hasAttempted,
    canRetake,
    attemptCount: Number.isFinite(attemptCountNum as number) ? (attemptCountNum as number) : undefined,
    lastAttemptId,
    ...(opensAt != null ? { opensAt } : {}),
    ...(closesAt != null ? { closesAt } : {}),
    ...(tryoutStatus != null ? { tryoutStatus } : {}),
    ...(startDisabledReason != null ? { startDisabledReason } : {}),
    ...(canRegister !== undefined ? { canRegister } : {}),
    ...(canStartExam !== undefined ? { canStartExam } : {}),
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

function pickDashboardStr(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

function dashInt(v: unknown): number | undefined {
  const n = toFiniteNumber(v)
  return n !== undefined ? Math.trunc(n) : undefined
}

function normalizeStudentDashboard(data: unknown): StudentDashboardResponse {
  const root = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  const base =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root

  const trySrc = base.tryoutSummary ?? base.tryout_progress ?? base.tryoutProgress ?? base.tryouts ?? base.tryout
  let tryoutSummary: StudentDashboardResponse['tryoutSummary']
  if (trySrc && typeof trySrc === 'object' && !Array.isArray(trySrc)) {
    const t = trySrc as Record<string, unknown>
    tryoutSummary = {
      attemptedCount: dashInt(
        t.attemptedCount ?? t.attempted_count ?? t.totalAttempts ?? t.total_attempts ?? t.attemptCount ?? t.attempt_count,
      ),
      completedCount: dashInt(t.completedCount ?? t.completed_count ?? t.finishedCount ?? t.finished_count),
      registeredCount: dashInt(t.registeredCount ?? t.registered_count ?? t.joinedCount ?? t.joined_count),
      averageScore: toFiniteNumber(t.averageScore ?? t.average_score ?? t.avgScore ?? t.avg_score),
      bestScore: toFiniteNumber(t.bestScore ?? t.best_score ?? t.highestScore ?? t.highest_score),
      upcomingCount: dashInt(t.upcomingCount ?? t.upcoming_count ?? t.availableCount ?? t.available_count),
      streakDays: dashInt(t.streakDays ?? t.streak_days),
      lastAttemptAt: pickDashboardStr(t.lastAttemptAt, t.last_attempt_at),
    }
  }

  const weekSrc = base.weeklyTarget ?? base.weekly_target
  let weeklyTarget: StudentDashboardResponse['weeklyTarget']
  if (weekSrc && typeof weekSrc === 'object' && !Array.isArray(weekSrc)) {
    const w = weekSrc as Record<string, unknown>
    weeklyTarget = {
      targetLessons: dashInt(w.targetLessons ?? w.target_lessons),
      targetTryouts: dashInt(w.targetTryouts ?? w.target_tryouts),
      completedLessons: dashInt(w.completedLessons ?? w.completed_lessons),
      completedTryouts: dashInt(w.completedTryouts ?? w.completed_tryouts),
    }
  }

  return {
    coursesCount: dashInt(base.coursesCount ?? base.courses_count),
    recentCourses: (base.recentCourses ?? base.recent_courses) as MyCourseItem[] | undefined,
    tryoutSummary,
    weeklyTarget,
    badges: base.badges as StudentDashboardResponse['badges'],
  }
}

export async function getStudentDashboard(): Promise<StudentDashboardResponse> {
  const res = await apiFetch(`${API_BASE}/student/dashboard`, { headers: authHeaders() })
  const raw = await handleResponse<unknown>(res)
  return normalizeStudentDashboard(raw)
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
    tryoutId: String(item.tryoutId ?? item.tryout_id ?? item.tryoutSessionId ?? item.tryout_session_id ?? ''),
    tryoutTitle: String(item.tryoutTitle ?? item.tryout_title ?? item.title ?? 'Tryout'),
    attemptId: item.attemptId != null ? String(item.attemptId) : (item.attempt_id != null ? String(item.attempt_id) : undefined),
    score: toFiniteNumber(item.score) ?? 0,
    submittedAt: String(item.submittedAt ?? item.submitted_at ?? item.finished_at ?? ''),
    improvementFromPrevious:
      toFiniteNumber(item.improvementFromPrevious ?? item.improvement_from_previous) ?? undefined,
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
  return parseSchoolDetailFromApiPayload(raw, schoolId, 'Sekolah')
}

/** Respons POST/GET sekolah: root, `data`, atau `school` + sinonim id snake_case. */
function parseSchoolDetailFromApiPayload(
  raw: unknown,
  fallbackId: string,
  fallbackName: string,
): SchoolDetailResponse {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      id: fallbackId.trim() ? fallbackId : '',
      name: fallbackName,
    }
  }
  const root = raw as Record<string, unknown>
  const nested =
    root.data != null && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null
  const fromSchoolKey =
    root.school != null && typeof root.school === 'object' && !Array.isArray(root.school)
      ? (root.school as Record<string, unknown>)
      : null
  const o = nested ?? fromSchoolKey ?? root
  const idRaw = o.id ?? o.school_id ?? o.schoolId
  const id = idRaw != null && String(idRaw).trim() ? String(idRaw).trim() : fallbackId.trim() ? fallbackId : ''
  const name = String(o.name ?? o.nama ?? fallbackName).trim() || fallbackName
  return {
    id,
    name,
    slug: o.slug != null ? String(o.slug) : undefined,
    description: o.description != null ? String(o.description) : undefined,
    address: o.address != null ? String(o.address) : undefined,
    logoUrl:
      o.logo_url != null ? String(o.logo_url) : o.logoUrl != null ? String(o.logoUrl) : undefined,
  }
}

export async function createSchool(body: CreateSchoolRequest): Promise<SchoolDetailResponse> {
  const payload: Record<string, unknown> = {
    name: body.name,
  }
  if (body.slug?.trim()) payload.slug = body.slug.trim()
  if (body.description?.trim()) payload.description = body.description.trim()
  if (body.address?.trim()) payload.address = body.address.trim()
  if (body.logoUrl?.trim()) {
    const u = body.logoUrl.trim()
    payload.logoUrl = u
    payload.logo_url = u
  }
  const res = await apiFetch(`${API_BASE}/schools`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  const raw = await handleResponse<unknown>(res)
  return parseSchoolDetailFromApiPayload(raw, '', body.name)
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
  levelId?: string
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
  levelId?: string
  subjectId?: string
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
    levelId: firstProfileStr(inner.levelId, inner.level_id),
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
  levelId?: string
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
  const primary = await apiFetch(`${API_BASE}/guru/profile`, { headers: authHeaders() })
  if (primary.status !== 404) {
    const raw = await handleResponse<unknown>(primary)
    return normalizeUserProfile(raw)
  }
  const fallback = await apiFetch(`${API_BASE}/trainer/profile`, { headers: authHeaders() })
  const raw = await handleResponse<unknown>(fallback)
  return normalizeUserProfile(raw)
}

export async function updateInstructorProfile(body: UpdateInstructorProfileRequest): Promise<void> {
  const primary = await apiFetch(`${API_BASE}/guru/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (primary.status !== 404) return handleResponse<void>(primary)
  const fallback = await apiFetch(`${API_BASE}/trainer/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<void>(fallback)
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
  questionNumber: number
  questionId: string
  questionType: string
  answeredCount: number
  unansweredCount: number
  correctCount: number
  wrongCount: number
  correctPercent: number
  wrongPercent: number
  optionDistribution: Record<string, number>
}

export interface InstructorTryoutAnalysisResponse {
  tryoutId: string
  tryoutTitle: string
  participantsCount: number
  questions: InstructorTryoutQuestionAnalysis[]
}

export interface InstructorTryoutStudentItem {
  userId: string
  userName: string
  userEmail: string
  attemptId: string
  score: number
  maxScore: number
  percentile?: number
  submittedAt: string
}

export interface InstructorAttemptAIAnalysisResponse {
  attemptId: string
  summary: string
  recap: string
  strengthAreas: string[]
  improvementAreas: string[]
  recommendation: string
}

function parseInstructorTryoutQuestionAnalysis(row: Record<string, unknown>): InstructorTryoutQuestionAnalysis {
  const optRaw = row.option_distribution ?? row.optionDistribution
  const optionDistribution: Record<string, number> = {}
  if (optRaw && typeof optRaw === 'object' && !Array.isArray(optRaw)) {
    for (const [k, v] of Object.entries(optRaw as Record<string, unknown>)) {
      const n = toFiniteNumber(v)
      if (n !== undefined) optionDistribution[k] = n
    }
  }
  return {
    questionNumber: Math.max(0, Math.trunc(toFiniteNumber(row.question_number ?? row.questionNumber) ?? 0)),
    questionId: String(row.question_id ?? row.questionId ?? ''),
    questionType: String(row.question_type ?? row.questionType ?? ''),
    answeredCount: Math.max(0, Math.trunc(toFiniteNumber(row.answered_count ?? row.answeredCount) ?? 0)),
    unansweredCount: Math.max(0, Math.trunc(toFiniteNumber(row.unanswered_count ?? row.unansweredCount) ?? 0)),
    correctCount: Math.max(0, Math.trunc(toFiniteNumber(row.correct_count ?? row.correctCount) ?? 0)),
    wrongCount: Math.max(0, Math.trunc(toFiniteNumber(row.wrong_count ?? row.wrongCount) ?? 0)),
    correctPercent: toFiniteNumber(row.correct_percent ?? row.correctPercent) ?? 0,
    wrongPercent: toFiniteNumber(row.wrong_percent ?? row.wrongPercent) ?? 0,
    optionDistribution,
  }
}

function parseInstructorTryoutAnalysisPayload(raw: unknown): InstructorTryoutAnalysisResponse {
  const root =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const base =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root

  const questionsRaw = base.questions
  const questionsArr = Array.isArray(questionsRaw) ? questionsRaw : []

  return {
    tryoutId: String(base.tryout_id ?? base.tryoutId ?? ''),
    tryoutTitle: String(base.tryout_title ?? base.tryoutTitle ?? ''),
    participantsCount: Math.max(
      0,
      Math.trunc(toFiniteNumber(base.participants_count ?? base.participantsCount) ?? 0),
    ),
    questions: (questionsArr as Record<string, unknown>[]).map(parseInstructorTryoutQuestionAnalysis),
  }
}

function parseInstructorTryoutStudentItem(row: Record<string, unknown>): InstructorTryoutStudentItem {
  const percentileRaw = toFiniteNumber(row.percentile)
  return {
    userId: String(row.user_id ?? row.userId ?? ''),
    userName: String(row.user_name ?? row.userName ?? ''),
    userEmail: String(row.user_email ?? row.userEmail ?? ''),
    attemptId: String(row.attempt_id ?? row.attemptId ?? ''),
    score: toFiniteNumber(row.score) ?? 0,
    maxScore: toFiniteNumber(row.max_score ?? row.maxScore) ?? 0,
    ...(percentileRaw !== undefined ? { percentile: percentileRaw } : {}),
    submittedAt: String(row.submitted_at ?? row.submittedAt ?? ''),
  }
}

function parseInstructorTryoutStudentsPayload(raw: unknown): InstructorTryoutStudentItem[] {
  if (Array.isArray(raw)) {
    return (raw as Record<string, unknown>[]).map(parseInstructorTryoutStudentItem)
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>
    const arr = Array.isArray(r.data) ? r.data : Array.isArray(r.students) ? r.students : []
    return (arr as Record<string, unknown>[]).map(parseInstructorTryoutStudentItem)
  }
  return []
}

function parseStringArrayField(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x)).filter((s) => s.length > 0)
}

function parseInstructorAttemptAIAnalysisPayload(raw: unknown): InstructorAttemptAIAnalysisResponse {
  const root =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const base =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root

  return {
    attemptId: String(base.attempt_id ?? base.attemptId ?? ''),
    summary: String(base.summary ?? ''),
    recap: String(base.recap ?? ''),
    strengthAreas: parseStringArrayField(base.strength_areas ?? base.strengthAreas),
    improvementAreas: parseStringArrayField(base.improvement_areas ?? base.improvementAreas),
    recommendation: String(base.recommendation ?? ''),
  }
}

export async function getInstructorTryoutAnalysis(tryoutId: string): Promise<InstructorTryoutAnalysisResponse> {
  const res = await apiFetch(`${API_BASE}/guru/tryouts/${encodeURIComponent(tryoutId)}/analysis`, { headers: authHeaders() })
  const raw = await handleResponse<unknown>(res)
  return parseInstructorTryoutAnalysisPayload(raw)
}

export async function getInstructorTryoutStudents(tryoutId: string): Promise<InstructorTryoutStudentItem[]> {
  const res = await apiFetch(`${API_BASE}/guru/tryouts/${encodeURIComponent(tryoutId)}/students`, { headers: authHeaders() })
  const raw = await handleResponse<unknown>(res)
  return parseInstructorTryoutStudentsPayload(raw)
}

export async function getInstructorAttemptAIAnalysis(
  tryoutId: string,
  attemptId: string
): Promise<InstructorAttemptAIAnalysisResponse> {
  const res = await apiFetch(
    `${API_BASE}/guru/tryouts/${encodeURIComponent(tryoutId)}/attempts/${encodeURIComponent(attemptId)}/ai-analysis`,
    { headers: authHeaders() }
  )
  const raw = await handleResponse<unknown>(res)
  return parseInstructorAttemptAIAnalysisPayload(raw)
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

// --- Course journey & admin program (API_BASE = /api/v1) ---

export interface LearningJourneyLessonOutline {
  id: string
  sectionId: string
  type: string
  title: string
  sortOrder: number
  completed: boolean
  locked: boolean
  progressPercent: number
  tryoutSessionId?: string
}

export interface LearningJourneySection {
  id: string
  courseId: string
  title: string
  sortOrder: number
  progressPercent: number
  lessons: LearningJourneyLessonOutline[]
}

export interface LearningJourneyCourseDetailPayload {
  course: { id: string; slug: string; title: string; description?: string }
  trackType?: 'meetings' | 'tryout'
  progressPercent: number
  completedLessons: number
  totalLessons: number
  sections: LearningJourneySection[]
}

export interface LearningJourneyLessonDetail {
  id: string
  sectionId: string
  courseId: string
  type: string
  title: string
  content?: string
  detailText?: string
  videoUrl?: string
  pdfUrl?: string
  liveClassUrl?: string
  tryoutSessionId?: string
  locked: boolean
  completed: boolean
}

function parseCourseJourneyPayload(raw: unknown): LearningJourneyCourseDetailPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const root = raw as Record<string, unknown>
  const data = (root.data ?? root) as Record<string, unknown>
  const sectionsRaw = data.sections
  if (!Array.isArray(sectionsRaw)) return null

  let course: { id: string; slug: string; title: string; description?: string }
  const courseRaw = data.course
  if (courseRaw && typeof courseRaw === 'object') {
    const c = courseRaw as Record<string, unknown>
    course = {
      id: String(c.id ?? ''),
      slug: String(c.slug ?? ''),
      title: String(c.title ?? ''),
      description: c.description != null ? String(c.description) : undefined,
    }
  } else {
    course = {
      id: String(data.courseId ?? data.course_id ?? data.id ?? ''),
      slug: String(data.slug ?? ''),
      title: String(data.title ?? ''),
      description: data.description != null ? String(data.description) : undefined,
    }
  }

  const trackRaw = data.trackType ?? data.track_type
  const trackType =
    trackRaw === 'tryout' || trackRaw === 'meetings' ? (trackRaw as 'meetings' | 'tryout') : undefined

  const sections: LearningJourneySection[] = []
  for (const s of sectionsRaw) {
    if (!s || typeof s !== 'object') continue
    const sec = s as Record<string, unknown>
    const lessonsRaw = sec.lessons
    const lessons: LearningJourneyLessonOutline[] = []
    if (Array.isArray(lessonsRaw)) {
      for (const l of lessonsRaw) {
        if (!l || typeof l !== 'object') continue
        const x = l as Record<string, unknown>
        const tid = x.tryoutSessionId ?? x.tryout_session_id
        lessons.push({
          id: String(x.id ?? ''),
          sectionId: String(x.sectionId ?? x.section_id ?? ''),
          type: String(x.type ?? 'text'),
          title: String(x.title ?? ''),
          sortOrder: Number(x.sortOrder ?? x.sort_order ?? 0),
          completed: Boolean(x.completed),
          locked: Boolean(x.locked),
          progressPercent: Number(x.progressPercent ?? x.progress_percent ?? 0),
          ...(typeof tid === 'string' && tid ? { tryoutSessionId: tid } : {}),
        })
      }
    }
    sections.push({
      id: String(sec.id ?? ''),
      courseId: String(sec.courseId ?? sec.course_id ?? ''),
      title: String(sec.title ?? ''),
      sortOrder: Number(sec.sortOrder ?? sec.sort_order ?? 0),
      progressPercent: Number(sec.progressPercent ?? sec.progress_percent ?? 0),
      lessons,
    })
  }

  return {
    course,
    trackType,
    progressPercent: Number(data.progressPercent ?? data.progress_percent ?? 0),
    completedLessons: Number(data.completedLessons ?? data.completed_lessons ?? 0),
    totalLessons: Number(data.totalLessons ?? data.total_lessons ?? 0),
    sections,
  }
}


export async function getCourseJourney(courseIdOrSlug: string): Promise<LearningJourneyCourseDetailPayload | null> {
  const res = await apiFetch(
    `${API_BASE}/courses/${encodeURIComponent(courseIdOrSlug)}/journey`,
    { headers: authHeaders() },
  )
  if (res.status === 404) return null
  const raw = await handleResponse<unknown>(res)
  return parseCourseJourneyPayload(raw)
}

export async function getLearningJourneyCourse(idOrSlug: string): Promise<LearningJourneyCourseDetailPayload | null> {
  return getCourseJourney(idOrSlug)
}

export async function getCourseLessonDetail(lessonId: string): Promise<LearningJourneyLessonDetail | null> {
  const res = await apiFetch(`${API_BASE}/courses/lessons/${encodeURIComponent(lessonId)}`, {
    headers: authHeaders(),
  })
  if (res.status === 404) return null
  const raw = await handleResponse<unknown>(res)
  const root = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  const d = (root.data ?? root) as Record<string, unknown>
  if (!d || typeof d !== 'object') return null
  const tryoutId = d.tryoutSessionId ?? d.tryout_session_id
  return {
    id: String(d.id ?? ''),
    sectionId: String(d.sectionId ?? d.section_id ?? ''),
    courseId: String(d.courseId ?? d.course_id ?? ''),
    type: String(d.type ?? 'text'),
    title: String(d.title ?? ''),
    content: d.content != null ? String(d.content) : undefined,
    detailText:
      d.detailText != null
        ? String(d.detailText)
        : d.detail_text != null
          ? String(d.detail_text)
          : undefined,
    videoUrl:
      d.videoUrl != null ? String(d.videoUrl) : d.video_url != null ? String(d.video_url) : undefined,
    pdfUrl: d.pdfUrl != null ? String(d.pdfUrl) : d.pdf_url != null ? String(d.pdf_url) : undefined,
    liveClassUrl:
      d.liveClassUrl != null
        ? String(d.liveClassUrl)
        : d.live_class_url != null
          ? String(d.live_class_url)
          : undefined,
    ...(typeof tryoutId === 'string' && tryoutId ? { tryoutSessionId: tryoutId } : {}),
    locked: Boolean(d.locked),
    completed: Boolean(d.completed),
  }
}

export async function getLearningJourneyLesson(lessonId: string): Promise<LearningJourneyLessonDetail | null> {
  return getCourseLessonDetail(lessonId)
}

export async function completeCourseLesson(lessonId: string): Promise<{
  lessonId: string
  completedAt: string
  nextLessonId?: string
}> {
  const res = await apiFetch(`${API_BASE}/courses/lessons/${encodeURIComponent(lessonId)}/complete`, {
    method: 'POST',
    headers: authHeaders(),
    body: '{}',
  })
  const raw = await handleResponse<unknown>(res)
  const root = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  const data = (root.data ?? root) as Record<string, unknown>
  const next = data.nextLessonId ?? data.next_lesson_id
  return {
    lessonId: String(data.lessonId ?? data.lesson_id ?? lessonId),
    completedAt: String(data.completedAt ?? data.completed_at ?? ''),
    ...(typeof next === 'string' && next ? { nextLessonId: next } : {}),
  }
}

export async function completeLearningJourneyLesson(lessonId: string): Promise<{
  lessonId: string
  completedAt: string
  nextLessonId?: string
}> {
  return completeCourseLesson(lessonId)
}

export interface AdminCourseListItem {
  id: string
  title: string
  slug?: string
  trackType?: 'meetings' | 'tryout'
}

export interface CourseMeetingProgramInput {
  meetingNumber: number
  title: string
  detailText?: string | null
  pdfUrl?: string | null
  prTitle?: string | null
  prDescription?: string | null
  liveClassUrl?: string | null
}

export interface CourseProgramResponse {
  trackType: 'meetings' | 'tryout'
  meetings: CourseMeetingProgramInput[]
  pretestTryoutSessionId?: string | null
}

function parseCourseProgramData(raw: unknown): CourseProgramResponse | null {
  if (!raw || typeof raw !== 'object') return null
  const root = raw as Record<string, unknown>
  const data = (root.data ?? root) as Record<string, unknown>
  const trackRaw = data.trackType ?? data.track_type
  const trackType = trackRaw === 'tryout' ? 'tryout' : 'meetings'
  const meetingsRaw = data.meetings
  const meetings: CourseMeetingProgramInput[] = []
  if (Array.isArray(meetingsRaw)) {
    for (const m of meetingsRaw) {
      if (!m || typeof m !== 'object') continue
      const x = m as Record<string, unknown>
      meetings.push({
        meetingNumber: Number(x.meetingNumber ?? x.meeting_number ?? 0),
        title: String(x.title ?? ''),
        detailText: x.detailText != null ? String(x.detailText) : (x.detail_text != null ? String(x.detail_text) : null),
        pdfUrl: x.pdfUrl != null ? String(x.pdfUrl) : (x.pdf_url != null ? String(x.pdf_url) : null),
        prTitle: x.prTitle != null ? String(x.prTitle) : (x.pr_title != null ? String(x.pr_title) : null),
        prDescription:
          x.prDescription != null
            ? String(x.prDescription)
            : x.pr_description != null
              ? String(x.pr_description)
              : null,
        liveClassUrl:
          x.liveClassUrl != null
            ? String(x.liveClassUrl)
            : x.live_class_url != null
              ? String(x.live_class_url)
              : null,
      })
    }
  }
  const pre = data.pretestTryoutSessionId ?? data.pretest_tryout_session_id
  return {
    trackType,
    meetings,
    pretestTryoutSessionId: typeof pre === 'string' && pre ? pre : pre === null ? null : undefined,
  }
}

export async function listAdminCourses(): Promise<AdminCourseListItem[]> {
  const res = await apiFetch(`${API_BASE}/admin/courses`, { headers: authHeaders() })
  const raw = await handleResponse<unknown>(res)
  const root = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  const list = Array.isArray(root.data) ? root.data : Array.isArray(raw) ? (raw as unknown[]) : []
  return (list as Record<string, unknown>[]).map((row) => {
    const tt = row.trackType ?? row.track_type
    return {
      id: String(row.id ?? ''),
      title: String(row.title ?? ''),
      slug: row.slug != null ? String(row.slug) : undefined,
      trackType: tt === 'tryout' || tt === 'meetings' ? (tt as 'meetings' | 'tryout') : undefined,
    }
  }).filter((x) => x.id)
}

export async function getAdminCourseProgram(courseId: string): Promise<CourseProgramResponse | null> {
  const res = await apiFetch(`${API_BASE}/admin/courses/${encodeURIComponent(courseId)}/program`, {
    headers: authHeaders(),
  })
  if (res.status === 404) return null
  const raw = await handleResponse<unknown>(res)
  return parseCourseProgramData(raw)
}

export async function putAdminCourseProgram(
  courseId: string,
  body: {
    trackType: 'meetings' | 'tryout'
    meetings: CourseMeetingProgramInput[]
    pretestTryoutSessionId?: string | null
  },
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/admin/courses/${encodeURIComponent(courseId)}/program`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  await handleResponse<unknown>(res)
}

export async function putAdminCourseLinkedTryouts(courseId: string, tryoutIds: string[]): Promise<void> {
  const res = await apiFetch(`${API_BASE}/admin/courses/${encodeURIComponent(courseId)}/linked-tryouts`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ tryoutIds }),
  })
  await handleResponse<unknown>(res)
}

export { clearApiErrorLog, getApiErrorLog } from './api-error-log'

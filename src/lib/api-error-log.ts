/**
 * Log kegagalan pemanggilan API: console.error + riwayat di localStorage (key `fansedu-api-error-log`).
 */

const STORAGE_KEY = 'fansedu-api-error-log'
const MAX_ENTRIES = 150

export type ApiClientFailureKind = 'http' | 'network'

export interface ApiClientFailureEntry {
  at: string
  kind: ApiClientFailureKind
  url: string
  method?: string
  status?: number
  message: string
  /** Respons backend yang sudah disanitasi (tanpa password/token panjang) */
  detail?: Record<string, unknown>
  errorName?: string
}

function sanitizeDetail(data: unknown): Record<string, unknown> | undefined {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) return undefined
  const src = data as Record<string, unknown>
  const out: Record<string, unknown> = {}
  const deny = new Set([
    'password',
    'password_confirmation',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'token',
    'access_token',
    'refresh_token',
    'authorization',
  ])
  for (const [k, v] of Object.entries(src)) {
    const key = k.toLowerCase()
    if (deny.has(key) || deny.has(k)) {
      out[k] = '[redacted]'
      continue
    }
    if (typeof v === 'string' && v.length > 500) {
      out[k] = `${v.slice(0, 200)}…`
      continue
    }
    if (v != null && typeof v === 'object') {
      out[k] = Array.isArray(v) ? `[array:${(v as unknown[]).length}]` : '[object]'
      continue
    }
    out[k] = v as unknown
  }
  return Object.keys(out).length ? out : undefined
}

function readStored(): ApiClientFailureEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as ApiClientFailureEntry[]) : []
  } catch {
    return []
  }
}

function writeStored(entries: ApiClientFailureEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    try {
      const trimmed = entries.slice(-Math.floor(MAX_ENTRIES / 2))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
      /* ignore quota */
    }
  }
}

/**
 * Catat kegagalan API: selalu `console.error`, tambahkan ke riwayat localStorage.
 */
export function recordApiClientFailure(input: Omit<ApiClientFailureEntry, 'at'>): void {
  const entry: ApiClientFailureEntry = {
    ...input,
    at: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    const prev = readStored()
    prev.push(entry)
    const next = prev.length > MAX_ENTRIES ? prev.slice(-MAX_ENTRIES) : prev
    writeStored(next)
  }

  console.error('[fansedu-api]', entry.kind, entry.message, {
    url: entry.url,
    method: entry.method,
    status: entry.status,
    detail: entry.detail,
    errorName: entry.errorName,
    at: entry.at,
  })
}

export function recordHttpApiFailure(
  res: Response,
  parsedBody: unknown,
  opts?: { method?: string; message?: string },
): void {
  const msg =
    opts?.message ||
    (typeof parsedBody === 'object' &&
    parsedBody &&
    'message' in parsedBody &&
    typeof (parsedBody as { message?: string }).message === 'string'
      ? (parsedBody as { message: string }).message
      : res.statusText) ||
    `HTTP ${res.status}`

  recordApiClientFailure({
    kind: 'http',
    url: res.url || '(unknown)',
    method: opts?.method,
    status: res.status,
    message: msg,
    detail: sanitizeDetail(parsedBody),
  })
}

export { STORAGE_KEY as API_ERROR_LOG_STORAGE_KEY, MAX_ENTRIES as API_ERROR_LOG_MAX_ENTRIES }

/** Untuk debug / halaman admin: baca riwayat error API di browser. */
export function getApiErrorLog(): ApiClientFailureEntry[] {
  return readStored()
}

export function clearApiErrorLog(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

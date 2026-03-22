/**
 * Konfigurasi base URL API untuk LMS & Landing.
 * Satu env: VITE_API_URL = http://localhost:8080/api/v1 (semua endpoint di bawah /api/v1).
 */

const ENV = import.meta.env as Record<string, string | boolean | undefined>
const rawFromEnv =
  (ENV.VITE_API_URL as string | undefined) ||
  (ENV.vite_api_url as string | undefined) // tolerate typo/lowercase key in some environments
const rawBaseFromEnv =
  (ENV.VITE_API_BASE_URL as string | undefined) || (ENV.vite_api_base_url as string | undefined)

function ensureUrlProtocol(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('/')) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  // Common misconfiguration: "localhost:8080/..." without protocol.
  return `http://${trimmed}`
}

function isLocalApiUrl(value: string): boolean {
  if (!value || value.startsWith('/')) return false
  try {
    const url = new URL(value)
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)
  } catch {
    return false
  }
}

const fallbackApi = 'http://localhost:8080/api/v1'
const configuredApi = ensureUrlProtocol((rawFromEnv && rawFromEnv.trim()) || fallbackApi)
const useDevProxy = import.meta.env.DEV && ENV.VITE_USE_DEV_PROXY !== 'false'
const RAW = useDevProxy && isLocalApiUrl(configuredApi) ? '/api/v1' : configuredApi

if (import.meta.env.DEV && !rawFromEnv) {
  // Helpful warning in development when env is not loaded.
  console.warn('[api-config] VITE_API_URL is undefined, using fallback:', configuredApi)
}

/** Base path API (auth, programs, checkout, student, instructor, packages) — sama dengan VITE_API_URL */
export const API_BASE = RAW.replace(/\/$/, '')

/** URL daftar paket landing: GET /packages (relatif ke API_BASE) */
export const PACKAGES_API_URL = `${API_BASE}/packages`

/** Origin backend (tanpa /api/v1) — untuk tryouts: BACKEND_BASE + /api/v1/tryouts/... */
export const BACKEND_BASE =
  useDevProxy
    ? ''
    : (rawBaseFromEnv && ensureUrlProtocol(rawBaseFromEnv).replace(/\/$/, '')) ||
      configuredApi.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '') ||
      'http://localhost:8080'

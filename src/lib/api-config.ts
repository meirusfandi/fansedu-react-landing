/**
 * Konfigurasi base URL API untuk LMS & Landing.
 * Satu env: VITE_API_URL = http://localhost:8080/api/v1 (semua endpoint di bawah /api/v1).
 */

const ENV = import.meta.env as Record<string, string | boolean | undefined>
const rawFromEnv =
  (ENV.VITE_API_URL as string | undefined) ||
  (ENV.vite_api_url as string | undefined) // tolerate typo/lowercase key in some environments
const rawBaseFromEnv = (ENV.VITE_API_BASE_URL as string | undefined) || (ENV.vite_api_base_url as string | undefined)

const RAW = (rawFromEnv && rawFromEnv.trim()) || 'https://api.fansedu.web.id/api/v1'

if (import.meta.env.DEV && !rawFromEnv) {
  // Helpful warning in development when env is not loaded.
  console.warn('[api-config] VITE_API_URL is undefined, using fallback:', RAW)
}

/** Base path API (auth, programs, checkout, student, instructor, packages) — sama dengan VITE_API_URL */
export const API_BASE = RAW.replace(/\/$/, '')

/** URL daftar paket landing: GET /packages (relatif ke API_BASE) */
export const PACKAGES_API_URL = `${API_BASE}/packages`

/** Origin backend (tanpa /api/v1) — untuk tryouts: BACKEND_BASE + /api/v1/tryouts/... */
export const BACKEND_BASE =
  (rawBaseFromEnv && rawBaseFromEnv.trim().replace(/\/$/, '')) ||
  RAW.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '') ||
  'https://api.fansedu.web.id'

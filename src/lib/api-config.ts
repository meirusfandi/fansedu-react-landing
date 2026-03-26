/**
 * Konfigurasi base URL API untuk LMS & Landing.
 * - `MODE` / `VITE_MODE` (via vite.config → `import.meta.env.VITE_MODE`): memilih fallback bila URL API tidak dipakai.
 * - `VITE_API_URL` jika di-set: dipakai, **kecuali** `npm run dev` + mode development + URL mengarah ke
 *   `api.fansedu.web.id` — supaya `.env` berisi URL prod (template) tidak menimpa localhost.
 *   Pakai `VITE_ALLOW_PRODUCTION_API_IN_DEV=true` bila memang ingin memukul API prod dari dev server.
 */

const ENV = import.meta.env as Record<string, string | boolean | undefined>

const PROD_API_HOST = 'api.fansedu.web.id'

function resolveAppMode(): 'development' | 'production' {
  /** Di-set dari `MODE` / `VITE_MODE` di .env lewat `define` di vite.config. */
  const fromEnv = String(ENV.VITE_MODE ?? '').trim().toLowerCase()
  if (fromEnv === 'production' || fromEnv === 'development') return fromEnv
  const viteMode = String(import.meta.env.MODE ?? '').trim().toLowerCase()
  if (viteMode === 'production' || viteMode === 'development') return viteMode as 'development' | 'production'
  return import.meta.env.PROD ? 'production' : 'development'
}
const rawFromEnv =
  (ENV.VITE_API_URL as string | undefined) ||
  (ENV.vite_api_url as string | undefined) // tolerate typo/lowercase key in some environments
const rawBaseFromEnv =
  (ENV.VITE_API_BASE_URL as string | undefined) || (ENV.vite_api_base_url as string | undefined)

const allowProdApiInDev = (() => {
  const v = String(ENV.VITE_ALLOW_PRODUCTION_API_IN_DEV ?? '').trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
})()

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

const appMode = resolveAppMode()

function isFanseduProductionApiHost(url: string): boolean {
  if (!url || url.startsWith('/')) return false
  try {
    const hostname = new URL(ensureUrlProtocol(url)).hostname
    return hostname === PROD_API_HOST
  } catch {
    return false
  }
}

/**
 * Di dev server + mode development, abaikan URL yang mengarah ke API prod FansEdu
 * agar perilaku selaras dengan ekspektasi "development = localhost".
 */
function effectiveApiEnvUrl(raw: string | undefined): string {
  const trimmed = (raw && raw.trim()) || ''
  if (!trimmed) return ''
  if (
    import.meta.env.DEV &&
    appMode === 'development' &&
    !allowProdApiInDev &&
    isFanseduProductionApiHost(trimmed)
  ) {
    return ''
  }
  return trimmed
}

const LOCAL_API = 'http://localhost:8080/api/v1'
const PROD_API = 'https://api.fansedu.web.id/api/v1'
const fallbackApi = appMode === 'production' ? PROD_API : LOCAL_API
const effectiveRawApi = effectiveApiEnvUrl(rawFromEnv)
const configuredApi = ensureUrlProtocol(effectiveRawApi || fallbackApi)
const useDevProxy =
  import.meta.env.DEV && appMode === 'development' && ENV.VITE_USE_DEV_PROXY !== 'false'
const RAW = useDevProxy && isLocalApiUrl(configuredApi) ? '/api/v1' : configuredApi

/** Base path API (auth, programs, checkout, student, guru, packages) — sama dengan VITE_API_URL */
export const API_BASE = RAW.replace(/\/$/, '')

/** URL daftar paket landing: GET /packages (relatif ke API_BASE) */
export const PACKAGES_API_URL = `${API_BASE}/packages`

/** Origin backend (tanpa /api/v1) — untuk tryouts: BACKEND_BASE + /api/v1/tryouts/... */
const fallbackBackendOrigin = appMode === 'production' ? 'https://api.fansedu.web.id' : 'http://localhost:8080'
const effectiveRawBase = effectiveApiEnvUrl(rawBaseFromEnv)
export const BACKEND_BASE =
  useDevProxy
    ? ''
    : (effectiveRawBase && ensureUrlProtocol(effectiveRawBase).replace(/\/$/, '')) ||
      configuredApi.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '') ||
      fallbackBackendOrigin

/**
 * Konfigurasi base URL API untuk LMS & Landing.
 * Satu env: VITE_API_URL = http://localhost:8080/api (base path ke API).
 */

const RAW = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080/api'

/** Base path API (untuk auth, programs, checkout, student, instructor) */
export const API_BASE = RAW.replace(/\/$/, '')

/** Base URL backend tanpa /api (untuk packages, tryouts, dll.) */
export const BACKEND_BASE = RAW.replace(/\/api\/?$/, '').replace(/\/$/, '')

/** URL daftar paket landing: GET /api/v1/packages */
export const PACKAGES_API_URL = `${BACKEND_BASE}/api/v1/packages`

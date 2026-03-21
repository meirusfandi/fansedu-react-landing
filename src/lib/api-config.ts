/**
 * Konfigurasi base URL API untuk LMS & Landing.
 * Satu env: VITE_API_URL = http://localhost:8080/api/v1 (semua endpoint di bawah /api/v1).
 */

console.log('MODE:', import.meta.env.MODE)
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)

const RAW = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080/api/v1'

/** Base path API (auth, programs, checkout, student, instructor, packages) — sama dengan VITE_API_URL */
export const API_BASE = RAW.replace(/\/$/, '')

/** URL daftar paket landing: GET /packages (relatif ke API_BASE) */
export const PACKAGES_API_URL = `${API_BASE}/packages`

/** Origin backend (tanpa /api/v1) — untuk tryouts: BACKEND_BASE + /api/v1/tryouts/... */
export const BACKEND_BASE = RAW.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '') || 'http://localhost:8080'

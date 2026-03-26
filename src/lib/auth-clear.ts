/**
 * Dipanggil saat API mengembalikan 401 / sesi tidak valid (hindari circular dep api <-> store).
 * Alihkan ke landing dulu supaya LMS tidak sempat redirect ke #/auth, lalu bersihkan token.
 */
import { useAuthStore } from '../store/auth'

const LANDING_HASH = '#/'

export function clearAuthOnUnauthorized() {
  if (typeof window !== 'undefined') {
    const h = window.location.hash || ''
    const normalized = h === '' || h === '#' ? '' : h
    if (normalized !== LANDING_HASH && normalized !== '#') {
      window.location.hash = LANDING_HASH
    }
  }
  useAuthStore.getState().logout()
}

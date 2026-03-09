/**
 * Dipanggil saat API mengembalikan 401 agar auth store di-clear (hindari circular dep api <-> store).
 */
import { useAuthStore } from '../store/auth'

export function clearAuthOnUnauthorized() {
  useAuthStore.getState().logout()
}

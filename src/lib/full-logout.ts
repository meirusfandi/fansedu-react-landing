import { apiLogout } from './api'
import { useAuthStore } from '../store/auth'
import { useNotificationsStore } from '../store/notifications'
import { useCheckoutStore } from '../store/checkout'

let inProgress = false

export function isLogoutUrl(): boolean {
  if (typeof window === 'undefined') return false
  const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/'
  if (path === '/logout') return true
  const hash = window.location.hash.slice(1) || '/'
  const h = hash.startsWith('/') ? hash.split('?')[0] : `/${hash.split('?')[0]}`
  return h === '/logout'
}

/**
 * Panggil API logout, hapus sesi & persist (auth, notifikasi, checkout), lalu ganti URL ke halaman login (#/auth).
 */
export async function performFullLogoutAndRedirect(): Promise<void> {
  if (inProgress) return
  inProgress = true

  try {
    await apiLogout()
  } catch {
    /* jaringan / server — tetap lanjut bersihkan klien */
  }

  useAuthStore.getState().logout()
  try {
    useAuthStore.persist.clearStorage()
  } catch {
    try {
      localStorage.removeItem('fansedu-auth')
      sessionStorage.removeItem('fansedu-auth')
    } catch {
      /* ignore */
    }
  }

  useNotificationsStore.getState().setItems([])
  try {
    useNotificationsStore.persist.clearStorage()
  } catch {
    try {
      localStorage.removeItem('fansedu-notifications')
      sessionStorage.removeItem('fansedu-notifications')
    } catch {
      /* ignore */
    }
  }

  useCheckoutStore.getState().reset()

  const origin = window.location.origin
  window.location.replace(`${origin}/#/auth`)
}

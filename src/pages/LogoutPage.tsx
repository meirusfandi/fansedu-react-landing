import { useEffect } from 'react'
import { performFullLogoutAndRedirect } from '../lib/full-logout'

/** Layar singkat saat /logout atau #/logout — membersihkan sesi lalu redirect ke #/auth */
export default function LogoutPage() {
  useEffect(() => {
    void performFullLogoutAndRedirect()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-slate-50 px-4 text-center">
      <p className="text-sm font-medium text-gray-700">Keluar dari akun…</p>
      <p className="text-xs text-gray-500">Menghapus sesi dan mengalihkan ke halaman masuk.</p>
    </div>
  )
}

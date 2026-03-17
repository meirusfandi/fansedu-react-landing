import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../store/auth'
import { apiLogout, apiGetMe } from '../../lib/api'
import type { AuthUser } from '../../types/auth'

export function LmsHeader() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const token = useAuthStore((s) => s.token)
  const [openDropdown, setOpenDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sinkronkan user dari backend saat ada token (validasi session & refresh data)
  useEffect(() => {
    if (!token) return
    apiGetMe()
      .then((me) => setUser({ id: me.id, name: me.name, email: me.email, role: me.role as AuthUser['role'] }))
      .catch(() => {})
  }, [token, setUser])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const dashboardHref = user?.role === 'instructor' ? '#/instructor' : '#/student'
  const dashboardLabel = user?.role === 'instructor' ? 'Dashboard Guru' : 'Dashboard Siswa'

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href="#/" className="font-bold text-lg text-primary">Fansedu LMS</a>
        <div className="flex items-center gap-5">
          <a href="#/catalog" className="text-gray-600 hover:text-primary text-sm font-medium">Katalog</a>
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setOpenDropdown((o) => !o)}
                className="flex items-center gap-2 text-gray-700 hover:text-primary text-sm font-medium"
              >
                <span className="max-w-[120px] truncate">{user.name}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {openDropdown && (
                <div className="absolute right-0 top-full mt-1 w-48 py-1 rounded-lg border bg-white shadow-lg">
                  <a href={dashboardHref} className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-50" onClick={() => setOpenDropdown(false)}>
                    {dashboardLabel}
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      try { await apiLogout(); } catch { /* ignore network/API errors */ }
                      logout()
                      setOpenDropdown(false)
                      window.location.hash = '/auth'
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50"
                  >
                    Keluar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a href="#/auth" className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover">Masuk</a>
          )}
        </div>
      </nav>
    </header>
  )
}

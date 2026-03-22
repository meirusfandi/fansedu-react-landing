import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../store/auth'
import { useNotificationsStore } from '../../store/notifications'
import { apiLogout, apiGetMe, getMyNotifications } from '../../lib/api'
import type { AuthUser } from '../../types/auth'

function isAllowedLmsRole(role: unknown): role is AuthUser['role'] {
  return role === 'student' || role === 'instructor'
}

export function LmsHeader() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const token = useAuthStore((s) => s.token)
  const [openDropdown, setOpenDropdown] = useState(false)
  const [openNotifications, setOpenNotifications] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const notifications = useNotificationsStore((s) => s.items)
  const setNotifications = useNotificationsStore((s) => s.setItems)
  const unreadCount = useNotificationsStore((s) => s.unreadCount())
  const markAsRead = useNotificationsStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationsStore((s) => s.markAllAsRead)

  // Sinkronkan user dari backend saat ada token (validasi session & refresh data)
  useEffect(() => {
    if (!token) return
    apiGetMe()
      .then((me) => {
        if (!isAllowedLmsRole(me.role)) {
          logout()
          window.location.hash = '/auth'
          return
        }
        setUser({ id: me.id, name: me.name, email: me.email, role: me.role })
      })
      .catch(() => {})
  }, [token, setUser, logout])

  useEffect(() => {
    if (!token) {
      setNotifications([])
      return
    }

    let cancelled = false
    const loadNotifications = () => {
      getMyNotifications()
        .then((res) => {
          if (cancelled) return
          setNotifications(
            (res.data || []).map((item) => ({
              id: item.id,
              title: item.title,
              message: item.body,
              href: item.href || (user?.role === 'instructor' ? '#/instructor' : '#/student'),
              read: Boolean(item.read),
              level: item.type === 'progress_update' ? 'success' : 'info',
              createdAt: item.createdAt || new Date().toISOString(),
            }))
          )
        })
        .catch(() => {})
    }

    loadNotifications()
    const id = window.setInterval(loadNotifications, 30000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [token, setNotifications, user?.role])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(false)
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) setOpenNotifications(false)
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
            <div className="flex items-center gap-2">
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => setOpenNotifications((o) => !o)}
                  className="relative w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:text-primary hover:border-primary/30"
                  aria-label="Notifikasi"
                >
                  <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] font-semibold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {openNotifications && (
                  <div className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-auto rounded-lg border bg-white shadow-lg">
                    <div className="px-4 py-3 border-b flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">Notifikasi</p>
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-xs text-primary font-medium hover:underline"
                        >
                          Tandai semua dibaca
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-500 text-center">Belum ada notifikasi.</p>
                    ) : (
                      <div className="py-1">
                        {notifications.slice(0, 8).map((item) => (
                          <a
                            key={item.id}
                            href={item.href || '#'}
                            onClick={() => {
                              markAsRead(item.id)
                              setOpenNotifications(false)
                            }}
                            className={`block px-4 py-3 border-b last:border-0 hover:bg-slate-50 ${item.read ? '' : 'bg-blue-50/40'}`}
                          >
                            <p className="text-sm font-medium text-gray-900">{item.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{item.message}</p>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
            </div>
          ) : (
            <a href="#/auth" className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover">Masuk</a>
          )}
        </div>
      </nav>
    </header>
  )
}

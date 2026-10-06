import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../store/auth'
import { useNotificationsStore, type AppNotification } from '../../store/notifications'
import { apiGetMe, getMyNotifications, type UserNotificationsResponse } from '../../lib/api'
import { performFullLogoutAndRedirect } from '../../lib/full-logout'
import { authUserFromApiResponse, LmsPortalAccessDeniedError } from '../../types/auth'

function mapNotificationsFromApi(res: UserNotificationsResponse, defaultHref: string): AppNotification[] {
  return (res.data || []).map((item) => ({
    id: item.id,
    title: item.title,
    message: item.body,
    href: item.href || defaultHref,
    read: Boolean(item.read),
    level: item.type === 'progress_update' ? 'success' : 'info',
    createdAt: item.createdAt || new Date().toISOString(),
  }))
}

export type LmsHeaderLayout = 'centered' | 'app'

interface LmsHeaderProps {
  /** `app`: baris header selaras dengan sidebar (kolom kiri w-64). `centered`: konten dibatasi max-w-6xl. */
  layout?: LmsHeaderLayout
  /** Layout `app`: sidebar navigasi terbuka. */
  appSidebarOpen?: boolean
  /** Layout `app`: toggle sembunyikan / tampilkan sidebar. */
  onAppSidebarToggle?: () => void
}

function getInitials(name?: string) {
  if (!name) return 'U'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function LmsHeader({ layout = 'centered', appSidebarOpen = true, onAppSidebarToggle }: LmsHeaderProps) {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
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

  // Sinkronkan user dari backend saat ada token
  useEffect(() => {
    if (!token) return
    let cancelled = false

    const syncMe = () => {
      if (cancelled || document.visibilityState !== 'visible') return
      apiGetMe()
        .then((me) => {
          if (cancelled) return
          try {
            const authUser = authUserFromApiResponse(me, token)
            setUser(authUser)
          } catch (e) {
            if (e instanceof LmsPortalAccessDeniedError) {
              void performFullLogoutAndRedirect()
            }
          }
        })
        .catch(() => {})
    }

    syncMe()
    document.addEventListener('visibilitychange', syncMe)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', syncMe)
    }
  }, [token, setUser])

  const defaultNotifHref = user?.role === 'guru' ? '#/guru' : '#/student'

  const applyNotificationsFromApi = useCallback(
    (res: UserNotificationsResponse) => {
      setNotifications(mapNotificationsFromApi(res, defaultNotifHref))
    },
    [setNotifications, defaultNotifHref]
  )

  useEffect(() => {
    if (!token) {
      setNotifications([])
      return
    }
    let cancelled = false
    getMyNotifications()
      .then((res) => {
        if (cancelled) return
        applyNotificationsFromApi(res)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token, setNotifications, applyNotificationsFromApi])

  useEffect(() => {
    if (!token || !openNotifications) return
    let cancelled = false
    getMyNotifications()
      .then((res) => {
        if (cancelled) return
        applyNotificationsFromApi(res)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token, openNotifications, applyNotificationsFromApi])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(false)
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) setOpenNotifications(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const dashboardHref = user?.role === 'guru' ? '#/guru' : '#/student'
  const dashboardLabel = user?.role === 'guru' ? 'Dashboard Guru' : 'Dashboard Siswa'

  // TeachSync style brand
  const brand = (
    <a href="#/" className="flex items-center gap-2.5 group">
      <div className="w-8 h-8 rounded-lg bg-teal-600 group-hover:bg-teal-700 transition-colors flex items-center justify-center shadow-xs">
        <span className="font-bold text-white text-base">F</span>
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-base text-slate-900 leading-tight">Fansedu</span>
        <span className="text-[10px] text-teal-600 font-semibold tracking-wider uppercase -mt-0.5">LMS Platform</span>
      </div>
    </a>
  )

  const actions = (
    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
      <a
        href="#/catalog"
        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors"
      >
        <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span>Katalog Kursus</span>
      </a>

      {user ? (
        <div className="flex items-center gap-2">
          {/* Tombol Notifikasi */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setOpenNotifications((o) => !o)}
              className="relative w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-teal-700 hover:border-teal-300 transition-colors flex items-center justify-center shadow-xs"
              aria-label="Notifikasi"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] leading-[18px] font-bold text-center ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {openNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[26rem] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">Notifikasi</p>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                        {unreadCount} baru
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-xs text-teal-600 hover:text-teal-800 font-semibold"
                    >
                      Tandai dibaca
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <span className="text-2xl" role="img" aria-label="Inbox">📭</span>
                    <p className="mt-2 text-sm text-slate-500 font-medium">Belum ada notifikasi baru.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.slice(0, 8).map((item) => (
                      <a
                        key={item.id}
                        href={item.href || '#'}
                        onClick={() => {
                          markAsRead(item.id)
                          setOpenNotifications(false)
                        }}
                        className={`block px-4 py-3 text-left transition-colors hover:bg-slate-50 ${item.read ? '' : 'bg-teal-50/30'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900 leading-snug">{item.title}</p>
                          {!item.read && <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1" />}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{item.message}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile Dropdown (TeachSync Style) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setOpenDropdown((o) => !o)}
              className="flex items-center gap-2.5 p-1 pr-2 rounded-full border border-slate-200 hover:border-teal-300 hover:bg-slate-50 transition-colors bg-white shadow-xs"
              aria-label="Profil Pengguna"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {getInitials(user.name)}
              </div>
              <span className="hidden sm:block max-w-[120px] lg:max-w-[150px] truncate text-xs font-semibold text-slate-800">
                {user.name}
              </span>
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 p-1.5 rounded-2xl border border-slate-200 bg-white shadow-xl z-50">
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                  <p className="text-[11px] text-teal-700 font-medium capitalize mt-0.5">
                    {user.role === 'guru' ? 'Instruktur / Guru' : 'Akun Siswa'}
                  </p>
                </div>
                <div className="py-1">
                  <a
                    href={dashboardHref}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800 rounded-xl transition-colors"
                    onClick={() => setOpenDropdown(false)}
                  >
                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span>{dashboardLabel}</span>
                  </a>
                  <a
                    href={user.role === 'guru' ? '#/guru/profile' : '#/student/profile'}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800 rounded-xl transition-colors"
                    onClick={() => setOpenDropdown(false)}
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Pengaturan Profil</span>
                  </a>
                  <a
                    href="#/"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                    onClick={() => setOpenDropdown(false)}
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Halaman Depan</span>
                  </a>
                </div>
                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(false)
                      void performFullLogoutAndRedirect()
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <a
          href="#/auth"
          className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs"
        >
          Masuk Akun
        </a>
      )}
    </div>
  )

  if (layout === 'app') {
    const collapsible = typeof onAppSidebarToggle === 'function'
    const sidebarOpen = collapsible ? appSidebarOpen : true

    return (
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="flex h-14 min-h-[3.5rem] w-full items-stretch">
          {/* Kolom kiri sejajar sidebar */}
          <div
            className={`hidden md:flex shrink-0 items-center justify-between border-r border-slate-200/90 bg-white px-4 transition-[width] duration-250 ${
              sidebarOpen ? 'w-64' : 'w-16'
            }`}
          >
            {sidebarOpen ? brand : (
              <a href="#/" className="mx-auto font-bold text-white w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-sm">
                F
              </a>
            )}
            {collapsible && (
              <button
                type="button"
                onClick={onAppSidebarToggle}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label={sidebarOpen ? 'Sembunyikan sidebar' : 'Buka sidebar'}
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  )}
                </svg>
              </button>
            )}
          </div>

          {/* Baris konten navigasi utama */}
          <div className="flex min-w-0 flex-1 items-center justify-between px-4 sm:px-6">
            <div className="flex md:hidden items-center gap-2">
              {brand}
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Portal Belajar Olimpiade Sains Nasional</span>
            </div>
            {actions}
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Utama">
        {brand}
        {actions}
      </nav>
    </header>
  )
}

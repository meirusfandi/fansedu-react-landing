import { useState, useEffect } from 'react'
import { LmsHeader } from '../../components/lms/Header'
import { AuthGuard } from '../../components/lms/AuthGuard'
import { useLmsSidebarVisible } from '../../hooks/useLmsSidebarVisible'
import { useAuthStore } from '../../store/auth'
import { performFullLogoutAndRedirect } from '../../lib/full-logout'

interface NavItem {
  href: string
  label: string
  icon: (active: boolean) => React.ReactNode
  badge?: string
  badgeColor?: string
}

export function StudentLayout({ children, currentPath }: { children: React.ReactNode; currentPath: string }) {
  const { sidebarVisible, toggleSidebar } = useLmsSidebarVisible('student')
  const user = useAuthStore((s) => s.user)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Tutup drawer ketika route berubah
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [currentPath])

  const onRedirect = (path: string) => {
    window.location.hash = path.replace('#', '')
  }

  const isCurrentActive = (itemHref: string) => {
    const raw = itemHref.replace('#', '')
    if (raw === '/student') {
      return currentPath === '/student'
    }
    return currentPath === raw || currentPath.startsWith(raw + '/')
  }

  const getInitials = (name?: string) => {
    if (!name) return 'S'
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const MENU: NavItem[] = [
    {
      href: '#/student',
      label: 'Dashboard',
      icon: (active) => (
        <svg className={`w-5 h-5 shrink-0 ${active ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      href: '#/student/courses',
      label: 'Kursus Saya',
      icon: (active) => (
        <svg className={`w-5 h-5 shrink-0 ${active ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      href: '#/student/tryout',
      label: 'Tryout OSN',
      badge: 'Gratis',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: (active) => (
        <svg className={`w-5 h-5 shrink-0 ${active ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      href: '#/student/practice',
      label: 'Latihan Koding',
      icon: (active) => (
        <svg className={`w-5 h-5 shrink-0 ${active ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
    {
      href: '#/student/transactions',
      label: 'Transaksi',
      icon: (active) => (
        <svg className={`w-5 h-5 shrink-0 ${active ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      href: '#/student/profile',
      label: 'Profil Siswa',
      icon: (active) => (
        <svg className={`w-5 h-5 shrink-0 ${active ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  // Navigasi bawah untuk mobile (Thumb-friendly bottom bar)
  const BOTTOM_NAV = [
    { href: '#/student', label: 'Home', icon: MENU[0].icon },
    { href: '#/student/courses', label: 'Kursus', icon: MENU[1].icon },
    { href: '#/student/tryout', label: 'Tryout', icon: MENU[2].icon },
    { href: '#/student/profile', label: 'Profil', icon: MENU[5].icon },
  ]

  return (
    <AuthGuard role="student" currentPath={currentPath} onRedirect={onRedirect}>
      <div className="min-h-screen flex flex-col bg-slate-50/70 text-slate-900 font-sans">
        {/* Header aplikasi dengan styling TeachSync */}
        <LmsHeader layout="app" appSidebarOpen={sidebarVisible} onAppSidebarToggle={toggleSidebar} />

        <div className="flex flex-1 min-h-0 relative">
          {/* Sidebar Desktop (TeachSync Style) */}
          <aside
            className={`hidden md:flex shrink-0 flex-col border-r border-slate-200/90 bg-white transition-[width,opacity,padding] duration-250 ease-out min-h-[calc(100vh-3.5rem)] ${
              sidebarVisible ? 'w-64 py-5 px-4 opacity-100' : 'w-0 overflow-hidden border-0 py-0 px-0 opacity-0 pointer-events-none'
            }`}
            inert={!sidebarVisible ? true : undefined}
          >
            {/* Header Mini Info Siswa */}
            <div className="mb-4 px-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Menu Siswa</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200/60">
                Mode Belajar
              </span>
            </div>

            {/* Navigasi Utama */}
            <nav className="flex flex-col gap-1.5 flex-1">
              {MENU.map((item) => {
                const active = isCurrentActive(item.href)
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-teal-50/90 text-teal-800 font-semibold shadow-xs ring-1 ring-teal-500/25'
                        : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon(active)}
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                        {item.badge}
                      </span>
                    )}
                  </a>
                )
              })}
            </nav>

            {/* Banner Motivasi Belajar OSN */}
            <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50/60 border border-teal-100/80">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base" role="img" aria-label="Target">🎯</span>
                <p className="text-xs font-bold text-teal-900">Target OSN 2026</p>
              </div>
              <p className="text-[11px] text-teal-700/90 leading-relaxed mb-2.5">
                Konsisten latihan soal &amp; ikuti tryout nasional untuk amankan medali impianmu!
              </p>
              <a
                href="#/student/tryout"
                className="block text-center text-xs font-semibold py-1.5 px-3 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs"
              >
                Cek Tryout Terbaru →
              </a>
            </div>

            {/* User Profile Mini Footer */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {getInitials(user?.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{user?.name || 'Siswa'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email || 'Akun Siswa'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void performFullLogoutAndRedirect()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Keluar Akun"
                aria-label="Keluar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </aside>

          {/* Mobile Drawer (Slide-over saat tombol hamburger diklik di layar kecil) */}
          {mobileDrawerOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                onClick={() => setMobileDrawerOpen(false)}
              />
              <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col p-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
                      F
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 leading-tight">Fansedu LMS</h3>
                      <p className="text-xs text-teal-600 font-medium">Mode Siswa</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Tutup Menu"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <nav className="flex flex-col gap-1.5 py-4 flex-1 overflow-y-auto">
                  {MENU.map((item) => {
                    const active = isCurrentActive(item.href)
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                          active
                            ? 'bg-teal-50 text-teal-800 font-semibold ring-1 ring-teal-500/20'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon(active)}
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                            {item.badge}
                          </span>
                        )}
                      </a>
                    )
                  })}
                </nav>

                <div className="pt-4 border-t border-slate-100">
                  <a
                    href="#/"
                    className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-teal-600 py-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Kembali ke Halaman Depan
                  </a>
                  <button
                    type="button"
                    onClick={() => void performFullLogoutAndRedirect()}
                    className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 text-center transition-colors border border-red-200"
                  >
                    Keluar Akun
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Area Konten Utama */}
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 bg-slate-50/70">
            {/* Tombol Buka Menu Cepat di Layar Mobile */}
            <div className="md:hidden flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs active:bg-slate-50"
              >
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Menu Navigasi</span>
              </button>
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/50">
                Siswa Aktif
              </span>
            </div>

            {children}
          </main>
        </div>

        {/* Bottom Nav Bar untuk Mobile (Duolingo/TeachSync Style: Thumb-Friendly) */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg"
          aria-label="Navigasi bawah mobile"
        >
          {BOTTOM_NAV.map((item) => {
            const active = isCurrentActive(item.href)
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
                  active ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.icon(active)}
                <span>{item.label}</span>
              </a>
            )
          })}
        </nav>
      </div>
    </AuthGuard>
  )
}

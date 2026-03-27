import '../App.css'
import { useEffect, useState } from 'react'
import { ApiError, getOpenTryouts, type OpenTryoutItem } from '../lib/api'
import { getTryoutScheduleText } from '../data/tryoutList'
import { useAuthStore } from '../store/auth'
import { filterStudentVisibleTryouts } from '../utils/tryoutStudent'
import { lmsDashboardHash } from '../utils/lmsDashboard'

/**
 * Halaman daftar tryout (public). Dari sini masing-masing item mengarah ke halaman detail tryout (#/tryout-info).
 * Dihubungkan dari section TryOut Gratis di landing page.
 */
export default function TryoutListPage() {
  const [tryouts, setTryouts] = useState<OpenTryoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const loggedIn = !!(user && token)
  const dashboardHref = lmsDashboardHash(user)

  useEffect(() => {
    getOpenTryouts()
      .then((list) => {
        setTryouts(filterStudentVisibleTryouts(list))
        setError(null)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat daftar tryout.')
        setTryouts([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a href="#/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center">
              <span className="font-display font-bold text-white text-lg">F</span>
            </div>
            <span className="font-display font-semibold text-xl hidden sm:inline">Fansedu</span>
          </a>
          <a href="#/" className="nav-link font-medium text-sm">
            ← Beranda
          </a>
          {loggedIn ? (
            <a href={dashboardHref} className="nav-link font-medium text-sm ml-2">
              Dashboard
            </a>
          ) : (
            <a href="#/auth" className="nav-link font-medium text-sm ml-2">
              Masuk
            </a>
          )}
          <a href="#/auth?tab=register" className="btn-primary px-4 py-2 rounded-full font-semibold text-sm inline-block ml-2">
            Daftar akun
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent)] text-white text-xs font-semibold uppercase tracking-wide mb-4">
            Free Tryout
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-[var(--fg)] mb-2">
            TryOut Gratis
          </h1>
          <p className="text-[var(--fg-muted)]">
            Semua proses tryout (lihat jadwal, daftar tryout, ikut ujian) dilakukan setelah Anda punya akun di platform. Daftar akun atau masuk terlebih dahulu, lalu akses menu Tryout di dashboard siswa untuk mendaftar tryout.
          </p>
        </div>

        {loading ? (
          <div className="border border-[var(--border)] rounded-2xl p-12 bg-[var(--card)] text-center text-[var(--fg-muted)]">
            Memuat daftar tryout...
          </div>
        ) : error ? (
          <div className="border border-[var(--border)] rounded-2xl p-12 bg-[var(--card)] text-center">
            <p className="text-[var(--fg-muted)] mb-4">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-secondary px-6 py-3 rounded-full font-medium"
            >
              Coba lagi
            </button>
          </div>
        ) : tryouts.length === 0 ? (
          <div className="border border-[var(--border)] rounded-2xl p-12 bg-[var(--card)] text-center text-[var(--fg-muted)]">
            Belum ada tryout yang terbuka. Cek kembali nanti atau kunjungi beranda untuk info terbaru.
          </div>
        ) : (
          <div className="space-y-4">
            {tryouts.map((t) => (
              <a
                key={t.id}
                href={t.detailPath}
                className="block border border-[var(--border)] rounded-2xl p-6 bg-[var(--card)] hover:border-[var(--accent)]/40 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="font-display font-semibold text-lg text-[var(--fg)]">{t.shortTitle || t.title}</h2>
                      {t.badge && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-semibold">
                          {t.badge}
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-sm text-[var(--fg-muted)] mb-1 line-clamp-2">{t.description}</p>
                    )}
                    <p className="text-sm text-[var(--fg-muted)]">{getTryoutScheduleText(t)}</p>
                  </div>
                  <span className="shrink-0 text-[var(--accent)] font-medium text-sm">Lihat detail →</span>
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
          <a href="#/auth?tab=register" className="btn-primary px-6 py-3 rounded-full font-semibold inline-block">
            Daftar akun untuk ikut tryout
          </a>
          <a
            href={loggedIn ? dashboardHref : '#/auth?redirect=%23%2Fstudent%2Ftryout'}
            className="text-[var(--accent)] hover:underline"
          >
            {loggedIn ? 'Buka dashboard' : 'Sudah punya akun? Masuk'}
          </a>
          <a href="#/" className="text-[var(--fg-muted)] hover:underline">← Kembali ke beranda</a>
        </div>
      </main>
    </div>
  )
}

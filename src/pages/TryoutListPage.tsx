import '../App.css'
import { useCallback, useEffect, useState } from 'react'
import { ApiError, type OpenTryoutItem } from '../lib/api'
import { getTryoutScheduleText } from '../data/tryoutList'
import { useAuthStore } from '../store/auth'
import { TryoutListSkeleton } from '../components/tryout/TryoutListSkeleton'
import { fetchVisibleTryoutsForViewer } from '../utils/fetchVisibleTryouts'
import { lmsDashboardHash } from '../utils/lmsDashboard'

/**
 * Halaman daftar tryout (public). Kartu → info publik (#/tryout-info/:id); jika sudah login sebagai siswa, tersedia pintasan ke LMS (#/student/tryout/:id).
 */
export default function TryoutListPage() {
  const [tryouts, setTryouts] = useState<OpenTryoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const loggedIn = !!(user && token)
  const isGuru = user?.role === 'guru'
  const dashboardHref = lmsDashboardHash(user)

  const preferStudentOpen = loggedIn && !isGuru

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchVisibleTryoutsForViewer({ preferStudentOpen })
      .then((list) => {
        if (!cancelled) {
          setTryouts(list)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Gagal memuat daftar tryout.')
          setTryouts([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [preferStudentOpen, reloadKey])

  const retryLoad = useCallback(() => setReloadKey((k) => k + 1), [])

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
            <>
              <a href={dashboardHref} className="nav-link font-medium text-sm ml-2">
                Dashboard
              </a>
              {!isGuru ? (
                <a href="#/student/tryout" className="nav-link font-medium text-sm ml-2">
                  Tryout LMS
                </a>
              ) : (
                <a href="#/student/tryout" className="nav-link font-medium text-sm ml-2 opacity-80">
                  Tryout (siswa)
                </a>
              )}
            </>
          ) : (
            <a href="#/auth" className="nav-link font-medium text-sm ml-2">
              Masuk
            </a>
          )}
          <a
            href="#/auth?tab=register&redirect=%23%2Ftryout"
            className="btn-primary px-4 py-2 rounded-full font-semibold text-sm inline-block ml-2"
          >
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
            {loggedIn && !isGuru
              ? 'Anda sudah masuk sebagai siswa. Gunakan tombol di setiap kartu untuk membuka halaman LMS (daftar & ujian), atau buka info publik untuk jadwal dan ringkasan aturan.'
              : loggedIn && isGuru
                ? 'Anda masuk sebagai guru. Untuk melihat alur siswa, gunakan tautan LMS per kartu atau menu Tryout (siswa) di atas. Info publik tetap tersedia untuk tiap tryout.'
                : 'Semua proses tryout (daftar ke tryout, mulai ujian) dilakukan lewat akun siswa di LMS. Halaman ini memuat tryout yang masih terbuka menurut jadwal (filter sama dengan dashboard). Daftar akun atau masuk dulu, lalu lanjutkan dari tombol di bawah.'}
          </p>
        </div>

        {loading ? (
          <TryoutListSkeleton rows={4} />
        ) : error ? (
          <div className="border border-[var(--border)] rounded-2xl p-12 bg-[var(--card)] text-center">
            <p className="text-[var(--fg-muted)] mb-4">{error}</p>
            <button type="button" onClick={retryLoad} className="btn-secondary px-6 py-3 rounded-full font-medium">
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
              <div
                key={t.id}
                className="border border-[var(--border)] rounded-2xl p-6 bg-[var(--card)] hover:border-[var(--accent)]/40 hover:shadow-lg transition-all"
              >
                <a href={`#/tryout-info/${encodeURIComponent(t.id)}`} className="block group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="font-display font-semibold text-lg text-[var(--fg)] group-hover:text-[var(--accent)]">
                          {t.shortTitle || t.title}
                        </h2>
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
                      {(t.durationMinutes != null || t.questionCount != null) && (
                        <p className="text-xs text-[var(--fg-muted)] opacity-90 mt-1">
                          {[t.durationMinutes != null ? `${t.durationMinutes} menit` : null, t.questionCount != null ? `${t.questionCount} soal` : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[var(--accent)] font-medium text-sm">Info publik →</span>
                  </div>
                </a>
                {loggedIn ? (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap items-center gap-3">
                    <a
                      href={`#/student/tryout/${encodeURIComponent(t.id)}`}
                      className="btn-primary px-4 py-2 rounded-full font-semibold text-sm inline-block"
                    >
                      {isGuru ? 'Buka di LMS siswa →' : 'Daftar & ujian (LMS) →'}
                    </a>
                    <span className="text-xs text-[var(--fg-muted)]">
                      {isGuru ? 'Pratinjau alur peserta' : 'Langsung ke detail tryout di dashboard siswa'}
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
          {loggedIn ? (
            <>
              {!isGuru ? (
                <a href="#/student/tryout" className="btn-primary px-6 py-3 rounded-full font-semibold inline-block">
                  Semua tryout di LMS siswa →
                </a>
              ) : null}
              <a href={dashboardHref} className="text-[var(--accent)] hover:underline font-medium">
                {isGuru ? 'Dashboard guru' : 'Dashboard'}
              </a>
              <a href="#/student/tryout" className="text-[var(--fg-muted)] hover:underline">
                Daftar tryout (LMS)
              </a>
            </>
          ) : (
            <>
              <a
                href="#/auth?tab=register&redirect=%23%2Ftryout"
                className="btn-primary px-6 py-3 rounded-full font-semibold inline-block"
              >
                Daftar akun untuk ikut tryout
              </a>
              <a href="#/auth?redirect=%23%2Fstudent%2Ftryout" className="text-[var(--accent)] hover:underline">
                Sudah punya akun? Masuk
              </a>
            </>
          )}
          <a href="#/" className="text-[var(--fg-muted)] hover:underline">← Kembali ke beranda</a>
        </div>
      </main>
    </div>
  )
}

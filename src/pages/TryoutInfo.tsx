import '../App.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, type OpenTryoutItem } from '../lib/api'
import {
  getTryoutCloseDateText,
  getTryoutRegistrationDeadlineText,
  getTryoutScheduleText,
} from '../data/tryoutList'
import { useAuthStore } from '../store/auth'
import { lmsDashboardHash } from '../utils/lmsDashboard'
import { TryoutListSkeleton } from '../components/tryout/TryoutListSkeleton'
import { fetchVisibleTryoutsForViewer } from '../utils/fetchVisibleTryouts'

interface TryoutInfoPageProps {
  tryoutId?: string | null
}

export default function TryoutInfoPage({ tryoutId = null }: TryoutInfoPageProps) {
  const [tryouts, setTryouts] = useState<OpenTryoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const loggedIn = !!(user && token)
  const isGuru = user?.role === 'guru'
  const preferStudentOpen = loggedIn && !isGuru
  const dashboardHref = lmsDashboardHash(user)

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
          setError(err instanceof ApiError ? err.message : 'Gagal memuat detail tryout.')
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

  const tryout = useMemo(() => {
    if (tryouts.length === 0) return null
    if (tryoutId) {
      const raw = tryoutId.trim()
      const decoded = (() => {
        try {
          return decodeURIComponent(raw)
        } catch {
          return raw
        }
      })()
      return tryouts.find((t) => t.id === raw || t.id === decoded) ?? null
    }
    return tryouts[0] ?? null
  }, [tryouts, tryoutId])

  const leaderboardHref = tryout?.id ? `#/leaderboard/${encodeURIComponent(tryout.id)}` : '#/leaderboard'
  const studentTryoutDetailHref = tryout?.id
    ? `#/student/tryout/${encodeURIComponent(tryout.id)}`
    : '#/student/tryout'
  const registerRedirectHash = tryout?.id
    ? encodeURIComponent(`#/tryout-info/${encodeURIComponent(tryout.id)}`)
    : encodeURIComponent('#/tryout-info')
  const scheduleText = tryout ? getTryoutScheduleText(tryout) : null
  const deadlineText = getTryoutRegistrationDeadlineText(tryout?.registrationDeadlineAt)
  const closeDateText = getTryoutCloseDateText(tryout?.closeAt)

  const decodedRouteTryoutId = useMemo(() => {
    if (!tryoutId?.trim()) return null
    const raw = tryoutId.trim()
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }, [tryoutId])

  const loginRedirectHash = useMemo(() => {
    const id = tryout?.id ?? decodedRouteTryoutId
    if (id) return encodeURIComponent(`#/student/tryout/${encodeURIComponent(id)}`)
    return encodeURIComponent('#/student/tryout')
  }, [tryout?.id, decodedRouteTryoutId])

  const durationLabel =
    tryout?.durationMinutes != null
      ? `${tryout.durationMinutes} menit`
      : 'Sesuai pengaturan lembar di dashboard siswa setelah Anda mulai ujian'
  const questionLabel =
    tryout?.questionCount != null
      ? `${tryout.questionCount} soal`
      : 'Tercantum pada lembar ujian yang dimuat dari server saat mulai'
  const pointsLabel =
    tryout?.pointsPerQuestion != null ? `${tryout.pointsPerQuestion} poin` : '5 poin (contoh default OSN-K)'
  const maxScoreDisplay =
    tryout?.maxScore != null
      ? String(tryout.maxScore)
      : tryout?.questionCount != null && tryout?.pointsPerQuestion != null
        ? String(tryout.questionCount * tryout.pointsPerQuestion)
        : '100'
  const questionCountTable =
    tryout?.questionCount != null ? String(tryout.questionCount) : '— (lihat lembar di LMS)'

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="h-8 w-48 bg-[var(--bg-secondary)] rounded-lg animate-pulse mb-2" />
          <p className="text-sm text-[var(--fg-muted)] mb-6">Memuat informasi tryout…</p>
          <TryoutListSkeleton rows={2} />
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
            <p className="text-[var(--fg-muted)] mb-4">{error}</p>
            <button type="button" onClick={retryLoad} className="btn-secondary px-6 py-3 rounded-full font-medium">
              Coba lagi
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!loading && !error && !tryout) {
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
            <a href="#/tryout" className="nav-link font-medium text-sm">
              Daftar tryout
            </a>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="font-display font-bold text-2xl text-[var(--fg)] mb-4">Tryout tidak tersedia</h1>
          <p className="text-[var(--fg-muted)] mb-6">
            {tryoutId
              ? 'Tryout ini tidak ditemukan di daftar yang sedang terbuka, atau periode mengikuti untuk peserta baru sudah berakhir. Data mengikuti API platform (sama dengan dashboard siswa).'
              : 'Saat ini belum ada tryout terbuka. Silakan cek lagi nanti.'}
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <a href="#/tryout" className="btn-primary px-6 py-3 rounded-full font-semibold inline-block text-center">
              ← Kembali ke daftar tryout
            </a>
            {decodedRouteTryoutId ? (
              <a
                href={`#/auth?redirect=${loginRedirectHash}`}
                className="px-6 py-3 rounded-full font-semibold inline-block border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-center"
              >
                Masuk — lanjut ke LMS (tryout ini)
              </a>
            ) : null}
          </div>
        </main>
      </div>
    )
  }

  if (!tryout) {
    return null
  }

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
          <a href="#/tryout" className="nav-link font-medium text-sm ml-2">
            Daftar tryout
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent)] text-white text-xs font-semibold uppercase tracking-wide mb-4">
            Free TryOut
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-[var(--fg)] mb-2">
            {tryout.shortTitle || tryout.title}
          </h1>
          <p className="text-[var(--fg-muted)]">
            Semua proses pendaftaran dan ujian dilakukan lewat akun platform (dashboard siswa). Informasi jadwal dan bobot di bawah mengikuti data API bila tersedia; angka pasti juga terlihat saat Anda membuka halaman tryout setelah masuk.
          </p>
          {closeDateText ? (
            <p className="text-sm text-[var(--fg-muted)] mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/50 px-4 py-2">
              <span className="font-medium text-[var(--fg)]">Tutup untuk peserta baru: </span>
              {closeDateText}
            </p>
          ) : null}
        </div>

        {/* 1. Informasi TryOut */}
        <section className="mb-16">
          <h2 className="font-display font-bold text-2xl text-[var(--fg)] mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold">1</span>
            Informasi TryOut
          </h2>
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Jadwal</h3>
              <p className="text-[var(--fg-muted)] mb-2">
                {scheduleText ? (
                  <>
                    Waktu tryout dibuka: <strong className="text-[var(--fg)]">{scheduleText.replace(/^Dibuka /, '')}</strong>.
                  </>
                ) : (
                  <>Jadwal tryout akan diumumkan.</>
                )}
              </p>
              <p className="text-[var(--fg-muted)]">
                TryOut dilaksanakan secara online; link dan akses ujian akan dikirim ke email peserta sekitar 1 jam sebelum pelaksanaan.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Peserta</h3>
              <p className="text-[var(--fg-muted)]">
                Tryout hanya untuk peserta yang sudah terdaftar di platform Fansedu. Siswa SMA/SMK/sederajat yang berminat mengikuti OSN Informatika wajib membuat akun terlebih dahulu; satu akun per peserta.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Cara ikut tryout</h3>
              <p className="text-[var(--fg-muted)] mb-4">
                Daftar akun di platform, lalu dari dashboard siswa buka menu <strong className="text-[var(--fg)]">Tryout</strong> untuk mendaftar tryout dan mengikuti ujian. Pastikan data nama, asal sekolah, kelas, dan email valid saat mendaftar akun.
                {deadlineText ? (
                  <>
                    {' '}
                    Batas pendaftaran per gelombang: <strong className="text-[var(--fg)]">{deadlineText}</strong>.
                  </>
                ) : null}
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`#/auth?tab=register&redirect=${registerRedirectHash}`}
                  className="btn-primary px-6 py-3 rounded-full font-semibold inline-block"
                >
                  Daftar akun
                </a>
                {loggedIn ? (
                  <>
                    {!isGuru ? (
                      <a
                        href={studentTryoutDetailHref}
                        className="btn-primary px-6 py-3 rounded-full font-semibold inline-block"
                      >
                        Lanjut: daftar tryout & ujian
                      </a>
                    ) : null}
                    <a
                      href={dashboardHref}
                      className="px-6 py-3 rounded-full font-semibold inline-block border border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                    >
                      {isGuru ? 'Dashboard guru' : 'Dashboard'}
                    </a>
                    {isGuru ? (
                      <a
                        href={studentTryoutDetailHref}
                        className="px-6 py-3 rounded-full font-semibold inline-block border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-sm"
                      >
                        Lihat halaman tryout (siswa)
                      </a>
                    ) : null}
                  </>
                ) : (
                  <a
                    href={`#/auth?redirect=${loginRedirectHash}`}
                    className="px-6 py-3 rounded-full font-semibold inline-block border border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                  >
                    Sudah punya akun? Masuk
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Detail Soal */}
        <section className="mb-16">
          <h2 className="font-display font-bold text-2xl text-[var(--fg)] mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold">2</span>
            Detail Soal TryOut
          </h2>
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 space-y-6">
            <p className="text-[var(--fg-muted)]">
              Cakupan ujian: <strong className="text-[var(--fg)]">{questionLabel}</strong> dengan durasi{' '}
              <strong className="text-[var(--fg)]">{durationLabel}</strong>. Angka dari server akan sama di halaman ini dan di LMS
              siswa setelah backend mengirim field meta tryout.
            </p>
            <p className="text-[var(--fg-muted)]">
              Contoh kerangka format OSN Informatika (rincian per gelombang mengikuti lembar resmi di platform):
            </p>

            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <h3 className="font-semibold text-[var(--accent)] mb-1">Bagian A: Abstraksi Berpikir Komputasional</h3>
                <p className="text-[var(--fg-muted)] text-sm">Soal cerita bergambar.</p>
              </div>
              <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <h3 className="font-semibold text-[var(--accent)] mb-1">Bagian B: Pemecahan Masalah Komputasional</h3>
                <p className="text-[var(--fg-muted)] text-sm">Soal pemrograman kompetitif sederhana.</p>
              </div>
              <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <h3 className="font-semibold text-[var(--accent)] mb-1">Bagian C: Pemahaman Algoritma dalam Bahasa C++</h3>
                <p className="text-[var(--fg-muted)] text-sm">Soal memahami kode C++.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/50">
              <span className="text-[var(--accent)] shrink-0">ℹ</span>
              <p className="text-[var(--fg-muted)] text-sm">
                Durasi berlaku untuk keseluruhan lembar. Pastikan koneksi internet stabil dan perangkat siap sebelum memulai dari
                dashboard siswa.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Cara Penilaian */}
        <section className="mb-16">
          <h2 className="font-display font-bold text-2xl text-[var(--fg)] mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold">3</span>
            Cara Penilaian
          </h2>
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 space-y-6">
            <p className="text-[var(--fg-muted)]">
              Cara penilaian TryOut ini mengacu pada spirit{' '}
              <strong className="text-[var(--fg)]">penilaian OSN tingkat Kabupaten/Kota (OSN-K)</strong> Bidang
              Informatika (hanya jawaban benar yang mendapat poin, tanpa pengurangan). Untuk simulasi di
              platform ini, <strong className="text-[var(--fg)]">bobot per soal diseragamkan</strong> agar total
              nilai jelas.
            </p>
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Bentuk Soal & Poin</h3>
              {tryout.gradingNotes ? (
                <div className="text-[var(--fg-muted)] mb-4 whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-4 text-sm">
                  {tryout.gradingNotes}
                </div>
              ) : (
                <p className="text-[var(--fg-muted)] mb-4">
                  Soal di platform dapat berupa <strong className="text-[var(--fg)]">pilihan ganda</strong>,{' '}
                  <strong className="text-[var(--fg)]">isian singkat</strong>, atau{' '}
                  <strong className="text-[var(--fg)]">benar/salah</strong>. Ringkasan angka mengikuti meta dari API; jika kosong,
                  tampilan memakai contoh default format OSN-K.
                </p>
              )}
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                      <th className="text-left py-3 px-4 text-[var(--fg-muted)] font-medium">Keterangan</th>
                      <th className="text-left py-3 px-4 text-[var(--fg-muted)] font-medium">Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--fg-muted)]">
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-3 px-4">Jumlah soal</td>
                      <td className="py-3 px-4 font-medium text-[var(--fg)]">{questionCountTable}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-3 px-4">Poin per jawaban benar (acuan)</td>
                      <td className="py-3 px-4 font-medium text-[var(--fg)]">{pointsLabel}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-3 px-4">Nilai maksimal (acuan)</td>
                      <td className="py-3 px-4 font-medium text-[var(--fg)]">{maxScoreDisplay}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Tidak Ada Pengurangan Nilai</h3>
              <p className="text-[var(--fg-muted)]">
                <strong className="text-[var(--fg)]">Jawaban salah atau kosong biasanya tidak mengurangi skor.</strong> Hanya
                jawaban benar yang menambah poin. Skor akhir mengikuti kebijakan server; paling tinggi sesuai nilai maksimal di
                atas.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Pengumuman Hasil</h3>
              <p className="text-[var(--fg-muted)]">
                Hasil dan leaderboard diumumkan setelah periode TryOut berakhir. Peserta dapat melihat skor dan peringkat di halaman ini (bagian Leaderboard).
              </p>
            </div>
          </div>
        </section>

        {/* 4. Leaderboard & Penggunaan AI */}
        <section className="mb-16">
          <h2 className="font-display font-bold text-2xl text-[var(--fg)] mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold">4</span>
            Leaderboard & Penggunaan AI
          </h2>
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Kebijakan Penggunaan AI</h3>
              <p className="text-[var(--fg-muted)] mb-4">
                TryOut ini bersifat <strong className="text-[var(--fg)]">latihan</strong>. Penggunaan alat bantu (termasuk AI seperti ChatGPT, Copilot, atau
                pencarian) diperbolehkan, namun akan <strong className="text-[var(--fg)]">ditandai di leaderboard</strong> agar transparan. Untuk persiapan OSN
                resmi, peserta disarankan juga berlatih tanpa bantuan AI agar kemampuan mandiri terukur.
              </p>
              <ul className="list-disc list-inside text-[var(--fg-muted)] space-y-1">
                <li>Peserta yang mengaku menggunakan bantuan AI akan dicantumkan dengan penanda di kolom &quot;Penggunaan AI&quot;.</li>
                <li>Leaderboard dapat menyertakan filter: tampil semua, atau hanya peserta tanpa bantuan AI (untuk perbandingan kemampuan murni).</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <p className="text-[var(--fg-muted)] text-sm">
                Peserta yang sudah mengerjakan tryout dapat melihat peringkat di halaman leaderboard. Peringkat disusun berdasarkan skor; penanda penggunaan AI
                mengikuti kebijakan transparansi di atas.
              </p>
              <a href={leaderboardHref} className="btn-secondary px-6 py-3 rounded-full font-semibold text-center whitespace-nowrap">
                Lihat Leaderboard
              </a>
            </div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 flex-wrap">
          <a
            href={`#/auth?tab=register&redirect=${registerRedirectHash}`}
            className="btn-primary px-8 py-4 rounded-full font-semibold text-center"
          >
            Daftar akun
          </a>
          {loggedIn && !isGuru ? (
            <a href={studentTryoutDetailHref} className="btn-primary px-8 py-4 rounded-full font-semibold text-center">
              Lanjut ke tryout (LMS siswa)
            </a>
          ) : null}
          {loggedIn && isGuru ? (
            <a href={studentTryoutDetailHref} className="btn-secondary px-8 py-4 rounded-full font-semibold text-center">
              Buka halaman tryout (siswa)
            </a>
          ) : null}
          <a
            href={loggedIn ? dashboardHref : `#/auth?redirect=${loginRedirectHash}`}
            className="btn-secondary px-8 py-4 rounded-full font-semibold text-center"
          >
            {loggedIn ? (isGuru ? 'Dashboard guru' : 'Dashboard') : 'Sudah punya akun? Masuk'}
          </a>
          <a href="#/" className="btn-secondary px-8 py-4 rounded-full font-semibold text-center">
            ← Kembali ke Beranda
          </a>
        </div>
      </main>
    </div>
  )
}

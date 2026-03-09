import { useEffect, useState } from 'react'
import '../App.css'
import { isLeaderboardVisible } from '../utils/tryoutDates'
import { BACKEND_BASE } from '../lib/api-config'

/** ID tryout untuk leaderboard — pemanggilan API selalu memakai ID ini (static) */
const STATIC_LEADERBOARD_TRYOUT_ID =
  (import.meta.env.VITE_TRYOUT_ID as string | undefined) || '6b5517c4-7708-409c-9dd7-eaa74878a007'

function getLeaderboardUrl(): string {
  return `${BACKEND_BASE}/api/v1/tryouts/${STATIC_LEADERBOARD_TRYOUT_ID}/leaderboard`
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  school: string
  hasAttempt: boolean
}

/** API row shape: GET /api/v1/tryouts/{id}/leaderboard → { rank, user_id, user_name, school_name, has_attempt } */
interface LeaderboardApiRow {
  rank?: number
  user_id?: string
  user_name?: string
  school_name?: string
  has_attempt?: boolean
  [key: string]: unknown
}

function normalizeEntry(raw: LeaderboardApiRow, index: number): LeaderboardEntry {
  const rank = raw.rank ?? index + 1
  const userId = typeof raw.user_id === 'string' ? raw.user_id : ''
  const name = typeof raw.user_name === 'string' ? raw.user_name : '—'
  const school = typeof raw.school_name === 'string' ? raw.school_name : '—'
  const hasAttempt = raw.has_attempt === true
  return { rank, userId, name, school, hasAttempt }
}

function parseLeaderboardResponse(data: unknown): LeaderboardEntry[] {
  if (Array.isArray(data)) return data.map((row, i) => normalizeEntry(row as LeaderboardApiRow, i))
  if (data && typeof data === 'object' && 'leaderboard' in data && Array.isArray((data as { leaderboard: unknown }).leaderboard)) {
    return ((data as { leaderboard: LeaderboardApiRow[] }).leaderboard).map((row, i) => normalizeEntry(row, i))
  }
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data
    if (Array.isArray(inner)) return inner.map((row: LeaderboardApiRow, i: number) => normalizeEntry(row, i))
    if (inner && typeof inner === 'object' && 'leaderboard' in inner && Array.isArray((inner as { leaderboard: unknown }).leaderboard)) {
      return ((inner as { leaderboard: LeaderboardApiRow[] }).leaderboard).map((row, i) => normalizeEntry(row, i))
    }
  }
  return []
}

interface TryoutLeaderboardPageProps {
  tryoutId?: string | null
}

export default function TryoutLeaderboardPage({ tryoutId = null }: TryoutLeaderboardPageProps) {
  const [visible, setVisible] = useState(() => isLeaderboardVisible())
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const leaderboardUrl = getLeaderboardUrl()

  useEffect(() => {
    const check = () => setVisible(isLeaderboardVisible())
    check()
    const intervalId = window.setInterval(check, 60 * 1000) // cek setiap 60 detik
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!visible) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(leaderboardUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: unknown) => {
        if (!cancelled) setEntries(parseLeaderboardResponse(data))
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Gagal memuat leaderboard')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [visible, leaderboardUrl])

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
          <a href={tryoutId ? `#/tryout-info/${tryoutId}` : '#/tryout-info'} className="nav-link font-medium text-sm">
            ← Detail TryOut
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!visible ? (
          <>
            <div className="mb-8 text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--fg-muted)] text-xs font-semibold uppercase tracking-wide mb-4">
                Leaderboard
              </span>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-[var(--fg)] mb-4">
                Leaderboard Belum Tersedia
              </h1>
              <p className="text-[var(--fg-muted)] max-w-md mx-auto">
                Leaderboard TryOut akan ditampilkan setelah <strong className="text-[var(--fg)]">5 Maret 2026</strong>. Silakan kembali setelah tanggal tersebut.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <a href={tryoutId ? `#/tryout-info/${tryoutId}` : '#/tryout-info'} className="btn-secondary px-8 py-4 rounded-full font-semibold text-center">
                ← Detail TryOut
              </a>
              <a href="#/" className="btn-secondary px-8 py-4 rounded-full font-semibold text-center">
                Kembali ke Beranda
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent)] text-white text-xs font-semibold uppercase tracking-wide mb-4">
                Leaderboard
              </span>
              <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-[var(--fg)] mb-2">
                Leaderboard TryOut OSN Informatika 2026
              </h1>
              <p className="text-[var(--fg-muted)]">
                Peringkat peserta TryOut. Kolom &quot;Sudah Mengerjakan&quot; menandai apakah peserta sudah mengerjakan (attempt) TryOut.
              </p>
            </div>

            <section className="mb-8">
              {loading ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] py-12 text-center text-[var(--fg-muted)]">
                  Memuat leaderboard…
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] py-8 px-6 text-center">
                  <p className="text-[var(--fg-muted)] mb-4">{error}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="btn-secondary px-6 py-3 rounded-full font-medium"
                  >
                    Coba lagi
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                        <th className="text-left py-3 px-4 text-[var(--fg-muted)] font-medium">Peringkat</th>
                        <th className="text-left py-3 px-4 text-[var(--fg-muted)] font-medium">Nama</th>
                        <th className="text-left py-3 px-4 text-[var(--fg-muted)] font-medium">Asal Sekolah</th>
                        <th className="text-center py-3 px-4 text-[var(--fg-muted)] font-medium">Sudah Mengerjakan</th>
                      </tr>
                    </thead>
                    <tbody className="text-[var(--fg-muted)]">
                      {entries.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 px-4 text-center text-[var(--fg-muted)]">
                            Belum ada data peringkat.
                          </td>
                        </tr>
                      ) : (
                        entries.map((row) => (
                          <tr key={row.userId || `${row.rank}-${row.name}-${row.school}`} className="border-b border-[var(--border)] last:border-b-0">
                            <td className="py-3 px-4 font-bold text-[var(--accent)]">{row.rank}</td>
                            <td className="py-3 px-4 text-[var(--fg)]">{row.name}</td>
                            <td className="py-3 px-4">{row.school}</td>
                            <td className="py-3 px-4 text-center">
                              {row.hasAttempt ? 'Ya' : 'Tidak'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[var(--fg-muted)] text-xs mt-3 italic">
                Data diambil dari <code className="bg-[var(--bg-secondary)] px-1 rounded">/api/v1/tryouts/{STATIC_LEADERBOARD_TRYOUT_ID}/leaderboard</code>. Kolom &quot;Sudah Mengerjakan&quot; menandai apakah peserta sudah attempt TryOut.
              </p>
            </section>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <a href={tryoutId ? `#/tryout-info/${tryoutId}` : '#/tryout-info'} className="btn-secondary px-8 py-4 rounded-full font-semibold text-center">
                ← Kembali ke Detail TryOut
              </a>
              <a href="#/" className="btn-secondary px-8 py-4 rounded-full font-semibold text-center">
                Kembali ke Beranda
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  )
}


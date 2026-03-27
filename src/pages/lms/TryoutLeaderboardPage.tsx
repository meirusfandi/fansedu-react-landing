import { useEffect, useState } from 'react'
import { ApiError, getTryoutLeaderboard, type TryoutLeaderboardEntry } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { isLeaderboardRowCurrentUser } from '../../utils/leaderboardUser'

interface TryoutLeaderboardPageProps {
  tryoutId: string
  role: 'student' | 'guru'
}

export default function TryoutLeaderboardPage({ tryoutId, role }: TryoutLeaderboardPageProps) {
  const myUserId = useAuthStore((s) => s.user?.id)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<TryoutLeaderboardEntry[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getTryoutLeaderboard(tryoutId)
      .then((rows) => {
        if (cancelled) return
        setEntries(rows)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Gagal memuat leaderboard.')
        setEntries([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tryoutId])

  const backHref = role === 'guru'
    ? `#/guru/tryouts/${encodeURIComponent(tryoutId)}`
    : `#/student/tryout/${encodeURIComponent(tryoutId)}`

  return (
    <div>
      <div className="mb-6">
        <a href={backHref} className="text-sm text-primary hover:underline">
          ← Kembali ke detail tryout
        </a>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Leaderboard Tryout</h1>
      <p className="text-gray-500 mb-6">
        Halaman leaderboard khusus dashboard {role === 'guru' ? 'guru' : 'siswa'}.
      </p>

      <div className="rounded-2xl border bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat leaderboard...</div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-amber-700 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50"
            >
              Coba lagi
            </button>
          </div>
        ) : (
          <div className="max-h-[min(70vh,36rem)] overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="sticky top-0 z-20 bg-slate-50 text-left py-3 px-4 font-semibold text-gray-900 shadow-[inset_0_-1px_0_0_#e5e7eb]">
                    Rank
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-50 text-left py-3 px-4 font-semibold text-gray-900 shadow-[inset_0_-1px_0_0_#e5e7eb]">
                    Nama
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-50 text-left py-3 px-4 font-semibold text-gray-900 shadow-[inset_0_-1px_0_0_#e5e7eb]">
                    Sekolah
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-50 text-left py-3 px-4 font-semibold text-gray-900 shadow-[inset_0_-1px_0_0_#e5e7eb]">
                    Skor
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-50 text-left py-3 px-4 font-semibold text-gray-900 shadow-[inset_0_-1px_0_0_#e5e7eb]">
                    Sudah Mengerjakan
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-gray-500">
                      Belum ada data leaderboard.
                    </td>
                  </tr>
                ) : (
                  entries.map((row) => {
                    const isMe = isLeaderboardRowCurrentUser(row.userId, myUserId)
                    return (
                      <tr
                        key={row.userId || `${row.rank}-${row.userName}`}
                        className={`border-b last:border-0 ${isMe ? 'bg-primary/5' : ''}`}
                      >
                        <td className={`py-3 px-4 text-primary ${isMe ? 'font-bold' : 'font-semibold'}`}>{row.rank}</td>
                        <td className={`py-3 px-4 ${isMe ? 'font-bold text-gray-900' : 'font-medium'}`}>{row.userName}</td>
                        <td className={`py-3 px-4 ${isMe ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{row.schoolName}</td>
                        <td className={`py-3 px-4 ${isMe ? 'font-bold' : ''}`}>{typeof row.score === 'number' ? row.score : '-'}</td>
                        <td className={`py-3 px-4 ${isMe ? 'font-bold' : ''}`}>{row.hasAttempt ? 'Ya' : 'Tidak'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

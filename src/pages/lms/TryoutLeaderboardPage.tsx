import { useEffect, useState } from 'react'
import { ApiError, getTryoutLeaderboard, type TryoutLeaderboardEntry } from '../../lib/api'

interface TryoutLeaderboardPageProps {
  tryoutId: string
  role: 'student' | 'guru'
}

export default function TryoutLeaderboardPage({ tryoutId, role }: TryoutLeaderboardPageProps) {
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Rank</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Nama</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Sekolah</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Skor</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Sudah Mengerjakan</th>
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
                  entries.map((row) => (
                    <tr key={row.userId || `${row.rank}-${row.userName}`} className="border-b last:border-0">
                      <td className="py-3 px-4 font-semibold text-primary">{row.rank}</td>
                      <td className="py-3 px-4 font-medium">{row.userName}</td>
                      <td className="py-3 px-4 text-gray-600">{row.schoolName}</td>
                      <td className="py-3 px-4">{typeof row.score === 'number' ? row.score : '-'}</td>
                      <td className="py-3 px-4">{row.hasAttempt ? 'Ya' : 'Tidak'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

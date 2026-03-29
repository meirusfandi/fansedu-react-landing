import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  getStudentTryoutStatus,
  getTryoutLeaderboard,
  getTryoutLeaderboardRank,
  type TryoutLeaderboardEntry,
  type TryoutLeaderboardRankResponse,
} from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { formatTryoutStatistic } from '../../utils/formatTryoutDisplay'
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
  const [myRank, setMyRank] = useState<TryoutLeaderboardRankResponse | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  /** Siswa: false = belum daftar → jangan tampilkan kartu "Posisi Anda" (mengikuti alur daftar dulu). */
  const [eligibleForPersonalRank, setEligibleForPersonalRank] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setMyRank(null)
    setEligibleForPersonalRank(null)
    const rankPromise =
      role === 'student' ? getTryoutLeaderboardRank(tryoutId) : Promise.resolve(null)
    const statusPromise =
      role === 'student' ? getStudentTryoutStatus(tryoutId).catch(() => null) : Promise.resolve(null)
    Promise.all([getTryoutLeaderboard(tryoutId), rankPromise, statusPromise])
      .then(([rows, rank, status]) => {
        if (cancelled) return
        setEntries(rows)
        setMyRank(rank)
        if (role === 'student') {
          if (rank?.inLeaderboard === false) {
            setEligibleForPersonalRank(false)
          } else if (status) {
            setEligibleForPersonalRank(Boolean(status.isRegistered || status.hasAttempted))
          } else {
            setEligibleForPersonalRank(null)
          }
        } else {
          setEligibleForPersonalRank(true)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Gagal memuat leaderboard.')
        setEntries([])
        setMyRank(null)
        setEligibleForPersonalRank(role === 'student' ? null : true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tryoutId, role, reloadKey])

  const retry = useCallback(() => setReloadKey((k) => k + 1), [])

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
        {role === 'student'
          ? 'Hanya peserta yang sudah mendaftar tryout yang tercatat di leaderboard (detail mengikuti server). Anda bisa melihat papan peringkat kapan saja.'
          : 'Peringkat peserta tryout.'}
      </p>

      {role === 'student' && !loading && eligibleForPersonalRank === false ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Anda belum mendaftar tryout ini — nama Anda biasanya{' '}
          <span className="font-semibold">belum masuk leaderboard</span> sampai Anda mendaftar di halaman detail tryout.
          Tabel di bawah menampilkan peserta terdaftar / yang sudah berpartisipasi sesuai data server.
        </div>
      ) : null}

      {role === 'student' &&
      eligibleForPersonalRank !== false &&
      myRank &&
      myRank.inLeaderboard !== false &&
      (myRank.rank != null || myRank.score != null) ? (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-gray-800">
          <span className="font-semibold text-gray-900">Posisi Anda: </span>
          {myRank.rank != null ? <>peringkat #{myRank.rank}</> : null}
          {myRank.rank != null && myRank.score != null ? ' · ' : null}
          {myRank.score != null ? <>skor {formatTryoutStatistic(myRank.score)}</> : null}
          {myRank.percentile != null && Number.isFinite(myRank.percentile) ? (
            <> · persentil {formatTryoutStatistic(myRank.percentile)}%</>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-2" aria-busy="true" aria-label="Memuat leaderboard">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-amber-700 mb-4">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50"
            >
              Coba lagi
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-gray-200">
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
                        <td className={`py-3 px-4 tabular-nums ${isMe ? 'font-bold' : ''}`}>
                          {Number.isFinite(row.score) ? formatTryoutStatistic(row.score) : '0'}
                        </td>
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

import { useCallback, useEffect, useState } from 'react'
import { ApiError, getStudentTryoutHistory, type StudentTryoutHistoryItem } from '../../lib/api'
import { formatTryoutDateTime, formatTryoutStatistic } from '../../utils/formatTryoutDisplay'

function HistoryTableSkeleton() {
  return (
    <div className="p-6 space-y-3" aria-busy="true" aria-label="Memuat riwayat">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded flex-1 max-w-xs" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded flex-1 max-w-[140px]" />
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
      ))}
    </div>
  )
}

export default function StudentTryoutHistoryPage() {
  const [rows, setRows] = useState<StudentTryoutHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getStudentTryoutHistory()
      .then((res) => {
        if (!cancelled) setRows(res.data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Gagal memuat riwayat tryout.')
          setRows([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const retry = useCallback(() => setReloadKey((k) => k + 1), [])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <a href="#/student/tryout" className="text-sm text-primary hover:underline">
            ← Kembali ke daftar tryout
          </a>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Riwayat tryout</h1>
          <p className="text-gray-500 text-sm mt-1">
            Percobaan yang sudah dikirim (maks. ~20 entri terakhir dari server).
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        {loading ? (
          <HistoryTableSkeleton />
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
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Belum ada riwayat pengiriman tryout.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Tryout</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Skor</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Dikirim</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Perbaikan</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.tryoutId}-${row.submittedAt}-${row.attemptId ?? ''}`}
                    className="border-b border-gray-100 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-900 font-medium">{row.tryoutTitle}</td>
                    <td className="py-3 px-4 text-gray-700 tabular-nums">{formatTryoutStatistic(row.score)}</td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {formatTryoutDateTime(row.submittedAt)}
                    </td>
                    <td className="py-3 px-4 text-gray-600 tabular-nums">
                      {row.improvementFromPrevious != null
                        ? (row.improvementFromPrevious >= 0 ? '+' : '') +
                          formatTryoutStatistic(row.improvementFromPrevious)
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {row.attemptId ? (
                        <a
                          href={`#/student/tryout/attempts/${encodeURIComponent(row.attemptId)}`}
                          className="text-primary text-sm font-medium hover:underline"
                        >
                          Detail hasil
                        </a>
                      ) : (
                        <a
                          href={`#/student/tryout/${encodeURIComponent(row.tryoutId)}`}
                          className="text-gray-500 text-sm hover:underline"
                        >
                          Info tryout
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { ApiError, getStudentTryoutHistory, type StudentTryoutHistoryItem } from '../../lib/api'

export default function StudentTryoutHistoryPage() {
  const [rows, setRows] = useState<StudentTryoutHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getStudentTryoutHistory()
      .then((res) => {
        if (!cancelled) {
          setRows(res.data)
        }
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
  }, [])

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
          <div className="p-8 text-center text-gray-500 text-sm">Memuat riwayat…</div>
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
                  <tr key={`${row.tryoutId}-${row.submittedAt}-${row.attemptId ?? ''}`} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-900 font-medium">{row.tryoutTitle}</td>
                    <td className="py-3 px-4 text-gray-700">{row.score}</td>
                    <td className="py-3 px-4 text-gray-600">{row.submittedAt || '—'}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {row.improvementFromPrevious != null
                        ? (row.improvementFromPrevious >= 0 ? '+' : '') + row.improvementFromPrevious
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`#/student/tryout/${encodeURIComponent(row.tryoutId)}`}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        Detail
                      </a>
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

import { useState, useEffect } from 'react'
import {
  getInstructorTryoutStudents,
  ApiError,
  type InstructorTryoutStudentItem,
} from '../../lib/api'
import { getOpenTryouts, type OpenTryoutItem } from '../../lib/api'

export default function GuruTryoutAnalysisPage({ tryoutId }: { tryoutId: string }) {
  const [students, setStudents] = useState<InstructorTryoutStudentItem[]>([])
  const [tryout, setTryout] = useState<OpenTryoutItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([getOpenTryouts(), getInstructorTryoutStudents(tryoutId)])
      .then(([tryouts, s]) => {
        const matchedTryout = (tryouts || []).find((item) => item.id === tryoutId) ?? null
        setTryout(matchedTryout)
        setStudents(Array.isArray(s) ? s : [])
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat data.')
        setTryout(null)
        setStudents([])
      })
      .finally(() => setLoading(false))
  }, [tryoutId])

  if (loading) return <div className="py-8 text-gray-500">Memuat analisis...</div>
  if (error) {
    return (
      <div className="space-y-4">
        <a href="#/guru/tryouts" className="text-primary font-medium text-sm hover:underline">← Daftar tryout</a>
        <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <a href="#/guru/tryouts" className="text-primary font-medium text-sm hover:underline">← Daftar tryout</a>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {tryout?.shortTitle || tryout?.title || 'Analisis Siswa Tryout'}
        </h1>
        <p className="text-gray-500 text-sm">
          ID: {tryoutId} · Total siswa: {students.length}
        </p>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Nama</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Skor</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Percentile</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Submit</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-gray-500">
                    Belum ada data siswa untuk tryout ini.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.attempt_id} className="border-b last:border-0">
                    <td className="py-3 px-4 font-medium">{s.user_name}</td>
                    <td className="py-3 px-4 text-gray-600">{s.user_email}</td>
                    <td className="py-3 px-4 text-right">
                      {s.score} / {s.max_score}
                    </td>
                    <td className="py-3 px-4 text-right">{s.percentile?.toFixed(1) ?? '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{s.submitted_at ? new Date(s.submitted_at).toLocaleString('id-ID') : '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <a
                          href={`#/guru/tryouts/${encodeURIComponent(tryoutId)}/students/${encodeURIComponent(s.user_id)}`}
                          className="text-slate-700 font-medium hover:underline"
                        >
                          Detail siswa
                        </a>
                        <a
                          href={`#/guru/tryouts/${encodeURIComponent(tryoutId)}/attempts/${encodeURIComponent(s.attempt_id)}/ai-analysis`}
                          className="text-primary font-medium hover:underline"
                        >
                          Analisis AI →
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

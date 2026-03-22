import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  getInstructorTryoutAnalysis,
  getInstructorTryoutStudents,
  type InstructorTryoutStudentItem,
} from '../../lib/api'

function scorePercent(score: number, maxScore: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return 0
  return (score / maxScore) * 100
}

export default function InstructorTryoutStudentDetailPage({
  tryoutId,
  studentId,
}: {
  tryoutId: string
  studentId: string
}) {
  const [tryoutTitle, setTryoutTitle] = useState('')
  const [students, setStudents] = useState<InstructorTryoutStudentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tryoutId || !studentId) return
    setLoading(true)
    setError(null)
    Promise.all([getInstructorTryoutAnalysis(tryoutId), getInstructorTryoutStudents(tryoutId)])
      .then(([analysis, rows]) => {
        setTryoutTitle(analysis?.tryout_title ?? '')
        setStudents(Array.isArray(rows) ? rows : [])
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat detail siswa tryout.')
        setStudents([])
      })
      .finally(() => setLoading(false))
  }, [tryoutId, studentId])

  const studentAttempts = useMemo(
    () => students.filter((item) => item.user_id === studentId),
    [students, studentId]
  )

  const studentMeta = studentAttempts[0]
  const bestAttempt = useMemo(
    () => studentAttempts.reduce<InstructorTryoutStudentItem | null>((best, item) => {
      if (!best) return item
      return item.score > best.score ? item : best
    }, null),
    [studentAttempts]
  )
  const latestAttempt = useMemo(
    () => studentAttempts.reduce<InstructorTryoutStudentItem | null>((latest, item) => {
      if (!latest) return item
      const latestTime = latest.submitted_at ? Date.parse(latest.submitted_at) : 0
      const itemTime = item.submitted_at ? Date.parse(item.submitted_at) : 0
      return itemTime > latestTime ? item : latest
    }, null),
    [studentAttempts]
  )

  if (loading) return <div className="py-8 text-gray-500">Memuat detail siswa...</div>
  if (error) {
    return (
      <div className="space-y-4">
        <a
          href={`#/instructor/tryouts/${encodeURIComponent(tryoutId)}`}
          className="text-primary font-medium text-sm hover:underline"
        >
          ← Kembali ke analisis tryout
        </a>
        <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>
      </div>
    )
  }

  if (!studentMeta) {
    return (
      <div className="space-y-4">
        <a
          href={`#/instructor/tryouts/${encodeURIComponent(tryoutId)}`}
          className="text-primary font-medium text-sm hover:underline"
        >
          ← Kembali ke analisis tryout
        </a>
        <div className="p-4 rounded-xl bg-white border text-sm text-gray-600">
          Data siswa tidak ditemukan untuk tryout ini.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <a
        href={`#/instructor/tryouts/${encodeURIComponent(tryoutId)}`}
        className="inline-block text-primary font-medium text-sm hover:underline"
      >
        ← Kembali ke analisis tryout
      </a>

      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{studentMeta.user_name}</h1>
        <p className="text-gray-500 text-sm">
          {studentMeta.user_email} {tryoutTitle ? `· ${tryoutTitle}` : ''}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Total Attempt</p>
          <p className="text-2xl font-bold text-gray-900">{studentAttempts.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Skor Tertinggi</p>
          <p className="text-2xl font-bold text-gray-900">
            {bestAttempt ? `${bestAttempt.score}/${bestAttempt.max_score}` : '-'}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Attempt Terakhir</p>
          <p className="text-sm font-semibold text-gray-900">
            {latestAttempt?.submitted_at
              ? new Date(latestAttempt.submitted_at).toLocaleString('id-ID')
              : '-'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h2 className="font-semibold text-gray-900">Riwayat Attempt Siswa</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-white">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Attempt ID</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Skor</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Nilai (%)</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Percentile</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Submit</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {studentAttempts.map((attempt) => (
                <tr key={attempt.attempt_id} className="border-b last:border-0">
                  <td className="py-3 px-4 font-medium text-gray-800">{attempt.attempt_id}</td>
                  <td className="py-3 px-4 text-right">
                    {attempt.score} / {attempt.max_score}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {scorePercent(attempt.score, attempt.max_score).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right">{attempt.percentile?.toFixed(1) ?? '-'}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <a
                      href={`#/instructor/tryouts/${encodeURIComponent(tryoutId)}/attempts/${encodeURIComponent(attempt.attempt_id)}/ai-analysis`}
                      className="text-primary font-medium hover:underline"
                    >
                      Lihat Analisis AI →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  getInstructorStudents,
  getInstructorTryoutStudents,
  getOpenTryouts,
  type InstructorStudentItem,
  type InstructorTryoutStudentItem,
} from '../../lib/api'

type TryoutAttemptWithMeta = InstructorTryoutStudentItem & {
  tryoutId: string
  tryoutTitle: string
}

function formatDateTime(iso?: string): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('id-ID')
  } catch {
    return iso
  }
}

function toPercent(score: number, maxScore: number): string {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return '0.0%'
  return `${((score / maxScore) * 100).toFixed(1)}%`
}

export default function GuruStudentDetailPage({ studentId }: { studentId: string }) {
  const [coursesRows, setCoursesRows] = useState<InstructorStudentItem[]>([])
  const [tryoutRows, setTryoutRows] = useState<TryoutAttemptWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) return
    setLoading(true)
    setError(null)

    Promise.all([getInstructorStudents(), getOpenTryouts()])
      .then(async ([studentsRes, tryoutsRes]) => {
        const allStudentRows = studentsRes.data ?? []
        const scopedRows = allStudentRows.filter((row) => row.userId === studentId)
        setCoursesRows(scopedRows)

        const tryoutRequests = (tryoutsRes ?? []).map(async (tryout) => {
          try {
            const participants = await getInstructorTryoutStudents(tryout.id)
            return participants
              .filter((item) => item.user_id === studentId)
              .map((item) => ({
                ...item,
                tryoutId: tryout.id,
                tryoutTitle: tryout.shortTitle || tryout.title,
              }))
          } catch {
            return []
          }
        })
        const allTryoutRows = (await Promise.all(tryoutRequests)).flat()
        allTryoutRows.sort((a, b) => {
          const aTs = a.submitted_at ? Date.parse(a.submitted_at) : 0
          const bTs = b.submitted_at ? Date.parse(b.submitted_at) : 0
          return bTs - aTs
        })
        setTryoutRows(allTryoutRows)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat detail siswa.')
        setCoursesRows([])
        setTryoutRows([])
      })
      .finally(() => setLoading(false))
  }, [studentId])

  const studentName = useMemo(
    () => coursesRows[0]?.name ?? tryoutRows[0]?.user_name ?? 'Siswa',
    [coursesRows, tryoutRows]
  )
  const studentEmail = useMemo(
    () => coursesRows[0]?.email ?? tryoutRows[0]?.user_email ?? '-',
    [coursesRows, tryoutRows]
  )
  const avgCourseProgress = useMemo(() => {
    if (coursesRows.length === 0) return 0
    const total = coursesRows.reduce((sum, row) => sum + (row.progressPercent || 0), 0)
    return Math.round(total / coursesRows.length)
  }, [coursesRows])

  if (loading) return <div className="py-8 text-gray-500">Memuat detail siswa...</div>
  if (error) return <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>

  return (
    <div className="space-y-6">
      <a href="#/guru/students" className="text-primary font-medium text-sm hover:underline">← Kembali ke daftar siswa</a>

      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{studentName}</h1>
        <p className="text-gray-500 text-sm">{studentEmail}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Total Kursus Diikuti</p>
          <p className="text-2xl font-bold text-gray-900">{coursesRows.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Rata-rata Progress Kursus</p>
          <p className="text-2xl font-bold text-gray-900">{avgCourseProgress}%</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Total Attempt Tryout</p>
          <p className="text-2xl font-bold text-gray-900">{tryoutRows.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h2 className="font-semibold text-gray-900">Progress Kursus</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-white border-b">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Kursus</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Progress</th>
            </tr>
          </thead>
          <tbody>
            {coursesRows.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-6 px-4 text-center text-gray-500">Belum ada data progress kursus.</td>
              </tr>
            ) : (
              coursesRows.map((row) => (
                <tr key={`${row.userId}-${row.programTitle}`} className="border-b last:border-0">
                  <td className="py-3 px-4">{row.programTitle}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${row.progressPercent}%` }} />
                      </div>
                      <span className="text-gray-600">{row.progressPercent}%</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h2 className="font-semibold text-gray-900">Progress Tryout (Per Siswa)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Tryout</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Skor</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Nilai</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Percentile</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Submit</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tryoutRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-gray-500">Belum ada attempt tryout.</td>
                </tr>
              ) : (
                tryoutRows.map((row) => (
                  <tr key={row.attempt_id} className="border-b last:border-0">
                    <td className="py-3 px-4">{row.tryoutTitle}</td>
                    <td className="py-3 px-4 text-right">{row.score} / {row.max_score}</td>
                    <td className="py-3 px-4 text-right">{toPercent(row.score, row.max_score)}</td>
                    <td className="py-3 px-4 text-right">{row.percentile?.toFixed(1) ?? '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{formatDateTime(row.submitted_at)}</td>
                    <td className="py-3 px-4">
                      <a
                        href={`#/guru/tryouts/${encodeURIComponent(row.tryoutId)}/attempts/${encodeURIComponent(row.attempt_id)}/ai-analysis?redirect=${encodeURIComponent(`#/guru/students/${studentId}`)}`}
                        className="text-primary font-medium hover:underline"
                      >
                        Analisis AI →
                      </a>
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

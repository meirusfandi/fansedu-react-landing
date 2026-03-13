import { useState, useEffect } from 'react'
import {
  getInstructorTryoutAnalysis,
  getInstructorTryoutStudents,
  ApiError,
  type InstructorTryoutQuestionAnalysis,
  type InstructorTryoutStudentItem,
} from '../../lib/api'

export default function InstructorTryoutAnalysisPage({ tryoutId }: { tryoutId: string }) {
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof getInstructorTryoutAnalysis>> | null>(null)
  const [students, setStudents] = useState<InstructorTryoutStudentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'soal' | 'siswa'>('soal')

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([getInstructorTryoutAnalysis(tryoutId), getInstructorTryoutStudents(tryoutId)])
      .then(([a, s]) => {
        setAnalysis(a)
        setStudents(Array.isArray(s) ? s : [])
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat data.')
        setAnalysis(null)
        setStudents([])
      })
      .finally(() => setLoading(false))
  }, [tryoutId])

  if (loading) return <div className="py-8 text-gray-500">Memuat analisis...</div>
  if (error) {
    return (
      <div className="space-y-4">
        <a href="#/instructor/tryouts" className="text-primary font-medium text-sm hover:underline">← Daftar tryout</a>
        <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <a href="#/instructor/tryouts" className="text-primary font-medium text-sm hover:underline">← Daftar tryout</a>
      </div>

      {analysis && (
        <div className="rounded-2xl border bg-white p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{analysis.tryout_title}</h1>
          <p className="text-gray-500 text-sm">ID: {analysis.tryout_id} · Peserta: {analysis.participants_count}</p>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('soal')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === 'soal' ? 'bg-primary/10 text-primary border border-b-0 border-gray-200 -mb-px' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Analisis per soal
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('siswa')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === 'siswa' ? 'bg-primary/10 text-primary border border-b-0 border-gray-200 -mb-px' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Daftar siswa
        </button>
      </div>

      {activeTab === 'soal' && analysis?.questions && (
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">No</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipe</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Dijawab</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Benar</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Salah</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Benar %</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Distribusi opsi</th>
                </tr>
              </thead>
              <tbody>
                {analysis.questions.map((q: InstructorTryoutQuestionAnalysis) => (
                  <tr key={q.question_id} className="border-b last:border-0">
                    <td className="py-3 px-4 font-medium">{q.question_number}</td>
                    <td className="py-3 px-4 text-gray-600">{q.question_type}</td>
                    <td className="py-3 px-4 text-right">{q.answered_count}</td>
                    <td className="py-3 px-4 text-right text-green-600">{q.correct_count}</td>
                    <td className="py-3 px-4 text-right text-red-600">{q.wrong_count}</td>
                    <td className="py-3 px-4 text-right">{q.correct_percent.toFixed(1)}%</td>
                    <td className="py-3 px-4">
                      <span className="text-gray-600">
                        {Object.entries(q.option_distribution || {})
                          .map(([opt, count]) => `${opt}: ${count}`)
                          .join(' · ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'siswa' && (
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
                      Belum ada data peserta.
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
                        <a
                          href={`#/instructor/tryouts/${encodeURIComponent(tryoutId)}/attempts/${encodeURIComponent(s.attempt_id)}/ai-analysis`}
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
      )}
    </div>
  )
}

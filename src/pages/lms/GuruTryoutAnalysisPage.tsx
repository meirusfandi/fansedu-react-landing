import { useState, useEffect } from 'react'
import {
  ApiError,
  getInstructorTryoutAnalysis,
  getInstructorTryoutStudents,
  getOpenTryouts,
  type InstructorTryoutAnalysisResponse,
  type InstructorTryoutStudentItem,
  type OpenTryoutItem,
} from '../../lib/api'

export default function GuruTryoutAnalysisPage({ tryoutId }: { tryoutId: string }) {
  const [students, setStudents] = useState<InstructorTryoutStudentItem[]>([])
  const [tryout, setTryout] = useState<OpenTryoutItem | null>(null)
  const [aggregate, setAggregate] = useState<InstructorTryoutAnalysisResponse | null>(null)
  const [aggregateNote, setAggregateNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setAggregate(null)
    setAggregateNote(null)
    Promise.all([
      getOpenTryouts(),
      getInstructorTryoutStudents(tryoutId),
      getInstructorTryoutAnalysis(tryoutId).catch((err) => {
        if (!cancelled) {
          setAggregateNote(
            err instanceof ApiError
              ? err.message
              : 'Terjadi kendala saat memuat ringkasan analisis. Silakan coba lagi nanti.',
          )
        }
        return null
      }),
    ])
      .then(([tryouts, s, analysis]) => {
        if (cancelled) return
        const matchedTryout = (tryouts || []).find((item) => item.id === tryoutId) ?? null
        setTryout(matchedTryout)
        setStudents(Array.isArray(s) ? s : [])
        if (analysis) setAggregate(analysis)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Gagal memuat data.')
          setTryout(null)
          setStudents([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
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
        <a
          href={`#/guru/tryouts/${encodeURIComponent(tryoutId)}/questions`}
          className="text-sm font-medium text-gray-600 hover:text-primary hover:underline"
        >
          Lembar soal (API) →
        </a>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {tryout?.shortTitle || tryout?.title || 'Analisis Siswa Tryout'}
        </h1>
        <p className="text-gray-500 text-sm">
          ID: {tryoutId} · Total siswa (tabel): {students.length}
          {aggregate ? (
            <span> · Peserta tercatat analisis: {aggregate.participants_count}</span>
          ) : null}
        </p>
      </div>

      {aggregate && aggregate.questions.length > 0 ? (
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h2 className="font-semibold text-gray-900">Analisis per soal</h2>
            <p className="text-xs text-gray-500 mt-1">
              Agregat dari API — distribusi jawaban & persentase benar/salah per nomor.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">No</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">ID soal</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipe</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Menjawab</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Benar %</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Salah %</th>
                </tr>
              </thead>
              <tbody>
                {aggregate.questions.map((q) => (
                  <tr key={q.question_id} className="border-b last:border-0">
                    <td className="py-3 px-4 font-medium">{q.question_number}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-xs">{q.question_id}</td>
                    <td className="py-3 px-4 text-gray-600">{q.question_type}</td>
                    <td className="py-3 px-4 text-right">{q.answered_count}</td>
                    <td className="py-3 px-4 text-right text-emerald-700">{q.correct_percent.toFixed(1)}</td>
                    <td className="py-3 px-4 text-right text-rose-700">{q.wrong_percent.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : aggregate && aggregate.questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-slate-50 px-4 py-6 text-sm text-gray-600">
          API analisis merespons tanpa daftar soal.
        </div>
      ) : aggregateNote ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {aggregateNote}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b bg-white">
          <h2 className="font-semibold text-gray-900">Daftar peserta</h2>
        </div>
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

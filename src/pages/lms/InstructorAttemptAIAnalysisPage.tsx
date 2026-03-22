import { useState, useEffect } from 'react'
import { getInstructorAttemptAIAnalysis, ApiError } from '../../lib/api'

export default function InstructorAttemptAIAnalysisPage({
  tryoutId,
  attemptId,
}: {
  tryoutId: string
  attemptId: string
}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getInstructorAttemptAIAnalysis>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const backHref = (() => {
    const hash = window.location.hash || ''
    const queryIndex = hash.indexOf('?')
    if (queryIndex === -1) return '#/instructor/students'
    const query = new URLSearchParams(hash.slice(queryIndex + 1))
    return query.get('redirect') || '#/instructor/students'
  })()

  useEffect(() => {
    setLoading(true)
    setError(null)
    getInstructorAttemptAIAnalysis(tryoutId, attemptId)
      .then(setData)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat analisis AI.')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [tryoutId, attemptId])

  if (loading) return <div className="py-8 text-gray-500">Memuat analisis AI...</div>
  if (error) {
    return (
      <div className="space-y-4">
        <a
          href={backHref}
          className="text-primary font-medium text-sm hover:underline"
        >
          ← Kembali
        </a>
        <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <a
        href={backHref}
        className="inline-block text-primary font-medium text-sm hover:underline"
      >
        ← Kembali
      </a>

      <div className="rounded-2xl border bg-white p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Analisis AI — Attempt {data.attempt_id.slice(0, 8)}…</h1>

        {data.summary && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Ringkasan</h2>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{data.summary}</p>
          </div>
        )}

        {data.recap && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Rekap</h2>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{data.recap}</p>
          </div>
        )}

        {data.strength_areas && data.strength_areas.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Area Kekuatan</h2>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              {data.strength_areas.map((area, i) => (
                <li key={i}>{area}</li>
              ))}
            </ul>
          </div>
        )}

        {data.improvement_areas && data.improvement_areas.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Area Perbaikan</h2>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              {data.improvement_areas.map((area, i) => (
                <li key={i}>{area}</li>
              ))}
            </ul>
          </div>
        )}

        {data.recommendation && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Rekomendasi</h2>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{data.recommendation}</p>
          </div>
        )}
      </div>
    </div>
  )
}

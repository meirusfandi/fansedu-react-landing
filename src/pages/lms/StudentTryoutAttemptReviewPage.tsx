import { useEffect, useState } from 'react'
import {
  ApiError,
  fetchTryoutAttemptReview,
  getStudentAttemptDetail,
  type StudentAttemptDetail,
  type TryoutAttemptReviewRow,
} from '../../lib/api'
import { TryoutAttemptResultView } from '../../components/lms/TryoutAttemptResultView'
import { formatTryoutDateTime } from '../../utils/formatTryoutDisplay'

function inferGradedFromStatus(status?: string): boolean | undefined {
  if (!status?.trim()) return undefined
  const u = status.toLowerCase()
  if (/\bpending\b|\bprocessing\b|\bgrading\b|\bdraft\b/.test(u)) return false
  if (/\bsubmitted\b|\bcompleted\b|\bdone\b|\bfinal\b/.test(u)) return true
  return undefined
}

export default function StudentTryoutAttemptReviewPage({ attemptId }: { attemptId: string }) {
  const [detail, setDetail] = useState<StudentAttemptDetail | null>(null)
  const [reviewRows, setReviewRows] = useState<TryoutAttemptReviewRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!attemptId.trim()) {
      setLoading(false)
      setError('ID percobaan tidak valid.')
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setDetail(null)
    setReviewRows(null)

    void getStudentAttemptDetail(attemptId)
      .then(async (d) => {
        if (cancelled) return
        setDetail(d)
        if (d.review && d.review.length > 0) {
          setReviewRows(d.review)
          return
        }
        try {
          const extra = await fetchTryoutAttemptReview(attemptId)
          if (cancelled) return
          if (extra && extra.length > 0) setReviewRows(extra)
        } catch {
          /* pembahasan opsional */
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Gagal memuat hasil pengerjaan.')
          setDetail(null)
          setReviewRows(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [attemptId])

  if (loading) {
    return (
      <div className="space-y-4 py-4" aria-busy="true" aria-label="Memuat hasil tryout">
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 max-w-xl rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />
        <p className="text-sm text-gray-500">Memuat detail percobaan…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <a href="#/student/tryout/history" className="text-sm text-primary hover:underline">
          ← Kembali ke riwayat tryout
        </a>
        <div className="mt-4 p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div>
        <a href="#/student/tryout/history" className="text-sm text-primary hover:underline">
          ← Kembali ke riwayat tryout
        </a>
        <p className="mt-4 text-gray-600 text-sm">Data percobaan tidak ditemukan.</p>
      </div>
    )
  }

  const tryoutId = detail.tryoutId ?? ''
  const backToTryoutHref = tryoutId ? `#/student/tryout/${encodeURIComponent(tryoutId)}` : '#/student/tryout'

  return (
    <div>
      <div className="mb-6">
        <a href="#/student/tryout/history" className="text-sm text-primary hover:underline">
          ← Riwayat tryout
        </a>
      </div>

      <TryoutAttemptResultView
        heading="Hasil pengerjaan"
        subtitle={detail.tryoutTitle}
        submittedAtLabel={detail.submittedAt ? formatTryoutDateTime(detail.submittedAt) : undefined}
        score={detail.score}
        displayMaxScore={detail.maxScore ?? 0}
        percentile={detail.percentile}
        feedback={undefined}
        message={undefined}
        thanksFallback="Ini ringkasan percobaan Anda. Gunakan pembahasan per soal untuk belajar dari jawaban yang kurang tepat."
        graded={inferGradedFromStatus(detail.status)}
        gradingStatus={detail.status}
        reviewRows={reviewRows}
        reviewLoading={false}
        paperQuestions={[]}
        attemptHydrationModuleAnalysis={detail.moduleAnalysis ?? detail.moduleSummary}
        submitModuleAnalysis={null}
        tryoutId={tryoutId}
        backHref={backToTryoutHref}
        backLabel="Kembali ke detail tryout"
      />
    </div>
  )
}

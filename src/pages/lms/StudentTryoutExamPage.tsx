import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ApiError,
  fetchTryoutAttemptReview,
  getStudentAttemptDetail,
  getStudentTryoutAttemptPaper,
  putAttemptAnswer,
  submitStudentTryoutAttempt,
  type TryoutAttemptPaper,
  type TryoutAttemptReviewRow,
  type TryoutAttemptSubmitResult,
  type TryoutExamQuestion,
  type TryoutOverallAnalysis,
} from '../../lib/api'
import type { TryoutModuleStat } from '../../utils/tryoutModuleAnalysis'
import { flushTryoutAnswersToServer } from '../../lib/tryout-exam-flush'
import {
  clearTryoutExamSession,
  getRemainingSecondsFromCachedExam,
  getTryoutExamDeadlineMs,
  getTryoutExamSession,
  persistTryoutExamDeadlineIfMissing,
  tryoutExamDraftKey,
  type TryoutExamSession,
} from '../../lib/tryout-exam-session'
import { QuestionBody } from '../../components/lms/QuestionBody'
import { TryoutAttemptResultView } from '../../components/lms/TryoutAttemptResultView'

type Phase =
  | 'init'
  | 'iframe-only'
  | 'loading-paper'
  | 'paper-error'
  | 'auto-submitting'
  | 'exam'
  | 'submitted'
  | 'missing-session'

function formatCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function loadDraft(tryoutId: string, attemptId: string): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(tryoutExamDraftKey(tryoutId, attemptId))
    if (!raw) return {}
    const p = JSON.parse(raw) as unknown
    if (!p || typeof p !== 'object' || Array.isArray(p)) return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

function saveDraft(tryoutId: string, attemptId: string, answers: Record<string, string>): void {
  try {
    sessionStorage.setItem(tryoutExamDraftKey(tryoutId, attemptId), JSON.stringify(answers))
  } catch {
    /* ignore */
  }
}

function mergeServerAndDraftAnswers(
  paper: TryoutAttemptPaper,
  tryoutId: string,
  attemptId: string,
): Record<string, string> {
  const fromServer: Record<string, string> = {}
  paper.questions.forEach((q) => {
    if (q.savedSelectedOption) fromServer[q.id] = q.savedSelectedOption
    else if (q.savedAnswerText) fromServer[q.id] = q.savedAnswerText
  })
  return { ...fromServer, ...loadDraft(tryoutId, attemptId) }
}

export default function StudentTryoutExamPage({ tryoutId }: { tryoutId: string }) {
  const backHref = `#/student/tryout/${encodeURIComponent(tryoutId)}`
  const [session, setSession] = useState<TryoutExamSession | null>(null)
  const [phase, setPhase] = useState<Phase>('init')
  const [paper, setPaper] = useState<TryoutAttemptPaper | null>(null)
  const [paperError, setPaperError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<TryoutAttemptSubmitResult | null>(null)
  const [submittedAttemptId, setSubmittedAttemptId] = useState<string | null>(null)
  const [reviewRows, setReviewRows] = useState<TryoutAttemptReviewRow[] | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  /** Sinkron dengan GET /student/attempts/:id setelah submit (review/modul dihitung ulang di server). */
  const [attemptHydration, setAttemptHydration] = useState<{
    moduleAnalysis: TryoutModuleStat[] | null
    maxScore: number | null
    overallAnalysis: TryoutOverallAnalysis | null
  } | null>(null)
  const [remainingSec, setRemainingSec] = useState(0)
  const autoSubmitFired = useRef(false)
  const prevRemainingRef = useRef<number | null>(null)
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const answerPutTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    return () => {
      Object.values(answerPutTimers.current).forEach((t) => clearTimeout(t))
    }
  }, [])

  const finalizeSubmit = useCallback(
    async (attemptId: string, answersMap: Record<string, string>, opts?: { quiet?: boolean }) => {
      setSubmitting(true)
      try {
        await flushTryoutAnswersToServer(attemptId, answersMap)
        const result = await submitStudentTryoutAttempt(tryoutId, attemptId, answersMap)
        setSubmitResult(result)
        setSubmittedAttemptId(attemptId)
        if (result.review && result.review.length > 0) {
          setReviewRows(result.review)
        }
        try {
          sessionStorage.removeItem(tryoutExamDraftKey(tryoutId, attemptId))
        } catch {
          /* ignore */
        }
        clearTryoutExamSession(tryoutId)
        setPhase('submitted')
      } catch (err) {
        if (!opts?.quiet) {
          window.alert(err instanceof ApiError ? err.message : 'Gagal mengirim jawaban.')
        }
        throw err
      } finally {
        setSubmitting(false)
      }
    },
    [tryoutId],
  )

  useEffect(() => {
    const s = getTryoutExamSession(tryoutId)
    setSession(s)
    if (!s) {
      setPhase('missing-session')
      return
    }
    if (!s.attemptId && s.examUrl) {
      setPhase('iframe-only')
      return
    }
    if (!s.attemptId) {
      setPhase('missing-session')
      return
    }

    const attemptId = s.attemptId
    const remFromCache = getRemainingSecondsFromCachedExam(s)
    if (remFromCache !== null && remFromCache <= 0) {
      setPhase('auto-submitting')
      const draft = loadDraft(tryoutId, attemptId)
      void finalizeSubmit(attemptId, draft, { quiet: true }).catch(() => {
        setPaperError('Waktu ujian habis, tetapi pengiriman jawaban gagal. Coba tombol di bawah atau hubungi admin.')
        setPhase('paper-error')
      })
      return
    }

    setPhase('loading-paper')
    getStudentTryoutAttemptPaper(tryoutId, attemptId)
      .then((p) => {
        persistTryoutExamDeadlineIfMissing(tryoutId, {
          endsAt: p.endsAt,
          timeLeftSeconds: p.timeLeftSeconds,
          durationMinutes: p.durationMinutes,
        })
        const s2 = getTryoutExamSession(tryoutId)
        if (s2) setSession(s2)
        const deadlineMs = getTryoutExamDeadlineMs(tryoutId)
        const rem =
          deadlineMs != null ? Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000)) : null
        if (rem !== null && rem <= 0) {
          const ans = mergeServerAndDraftAnswers(p, tryoutId, attemptId)
          setPaper(p)
          setAnswers(ans)
          setPhase('auto-submitting')
          void finalizeSubmit(attemptId, ans, { quiet: true }).catch(() => {
            setPaperError('Waktu habis sebelum halaman siap. Mengirim dari cache… gagal. Coba lagi.')
            setPhase('paper-error')
          })
          return
        }
        setPaper(p)
        setAnswers(mergeServerAndDraftAnswers(p, tryoutId, attemptId))
        setCurrentIndex(0)
        setPaperError(null)
        setPhase('exam')
      })
      .catch((err) => {
        setPaperError(err instanceof ApiError ? err.message : 'Gagal memuat soal.')
        const latest = getTryoutExamSession(tryoutId) ?? s
        const remFail = getRemainingSecondsFromCachedExam(latest)
        if (remFail !== null && remFail <= 0) {
          setPhase('auto-submitting')
          const draft = loadDraft(tryoutId, attemptId)
          void finalizeSubmit(attemptId, draft, { quiet: true }).catch(() => {
            setPhase('paper-error')
          })
          return
        }
        setPhase('paper-error')
      })
  }, [tryoutId, finalizeSubmit])

  useEffect(() => {
    if (phase !== 'submitted') {
      setAttemptHydration(null)
      return
    }
    if (!submittedAttemptId || import.meta.env.VITE_TRYOUT_EXAM_MOCK === 'true') return

    let cancelled = false
    setReviewLoading(true)

    void getStudentAttemptDetail(submittedAttemptId)
      .then((detail) => {
        if (cancelled) return
        setAttemptHydration({
          moduleAnalysis: (() => {
            const mod = detail.moduleAnalysis ?? detail.moduleSummary
            return mod && mod.length > 0 ? mod : null
          })(),
          maxScore: detail.maxScore,
          overallAnalysis: detail.overallAnalysis ?? null,
        })
        if (detail.review && detail.review.length > 0) {
          setReviewRows(detail.review)
        } else {
          void fetchTryoutAttemptReview(submittedAttemptId).then((rows) => {
            if (cancelled) return
            if (rows && rows.length > 0) setReviewRows(rows)
            else setReviewRows((prev) => prev ?? submitResult?.review ?? null)
          })
        }
      })
      .catch(() => {
        if (cancelled) return
        setAttemptHydration(null)
        void fetchTryoutAttemptReview(submittedAttemptId).then((rows) => {
          if (cancelled) return
          if (rows && rows.length > 0) setReviewRows(rows)
          else setReviewRows((prev) => prev ?? submitResult?.review ?? null)
        })
      })
      .finally(() => {
        if (!cancelled) setReviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [phase, submittedAttemptId, submitResult])

  useEffect(() => {
    if (phase !== 'exam' || !paper) return
    autoSubmitFired.current = false
    prevRemainingRef.current = null

    const tick = () => {
      let ms = getTryoutExamDeadlineMs(tryoutId)
      if (ms == null) {
        persistTryoutExamDeadlineIfMissing(tryoutId, {
          endsAt: paper.endsAt,
          timeLeftSeconds: paper.timeLeftSeconds,
          durationMinutes: paper.durationMinutes,
        })
        ms = getTryoutExamDeadlineMs(tryoutId)
      }
      if (ms != null && Number.isFinite(ms)) {
        setRemainingSec(Math.max(0, Math.floor((ms - Date.now()) / 1000)))
      }
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [phase, paper, tryoutId])

  const persistDraft = useCallback(
    (next: Record<string, string>) => {
      if (!session?.attemptId) return
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current)
      draftSaveTimer.current = setTimeout(() => {
        saveDraft(tryoutId, session.attemptId!, next)
      }, 400)
    },
    [session?.attemptId, tryoutId],
  )

  const schedulePutAnswer = useCallback(
    (questionId: string, selectedOption: string) => {
      if (!session?.attemptId || import.meta.env.VITE_TRYOUT_EXAM_MOCK === 'true') return
      const prevT = answerPutTimers.current[questionId]
      if (prevT) clearTimeout(prevT)
      answerPutTimers.current[questionId] = window.setTimeout(() => {
        void putAttemptAnswer(session.attemptId!, questionId, { selectedOption }).catch(() => {
          /* tetap andalkan draft lokal */
        })
        delete answerPutTimers.current[questionId]
      }, 550)
    },
    [session?.attemptId],
  )

  const schedulePutAnswerText = useCallback(
    (questionId: string, answerText: string) => {
      if (!session?.attemptId || import.meta.env.VITE_TRYOUT_EXAM_MOCK === 'true') return
      const key = `txt:${questionId}`
      const prevT = answerPutTimers.current[key]
      if (prevT) clearTimeout(prevT)
      answerPutTimers.current[key] = window.setTimeout(() => {
        void putAttemptAnswer(session.attemptId!, questionId, { answerText }).catch(() => {})
        delete answerPutTimers.current[key]
      }, 550)
    },
    [session?.attemptId],
  )

  const setAnswer = useCallback(
    (questionId: string, key: string) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: key }
        persistDraft(next)
        return next
      })
      schedulePutAnswer(questionId, key)
    },
    [persistDraft, schedulePutAnswer],
  )

  const setAnswerText = useCallback(
    (questionId: string, text: string) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: text }
        persistDraft(next)
        return next
      })
      schedulePutAnswerText(questionId, text)
    },
    [persistDraft, schedulePutAnswerText],
  )

  const questions = paper?.questions ?? []
  const currentQuestion: TryoutExamQuestion | undefined = questions[currentIndex]
  const answeredCount = useMemo(
    () => questions.filter((q) => Boolean(answers[q.id]?.trim())).length,
    [questions, answers],
  )

  const handleSubmit = useCallback(
    async (fromTimer = false) => {
      if (!session?.attemptId || phase !== 'exam' || submitting) return
      const unanswered = questions.length - answeredCount
      if (!fromTimer && unanswered > 0) {
        const ok = window.confirm(
          `Masih ada ${unanswered} soal tanpa jawaban. Yakin ingin mengirim jawaban sekarang?`,
        )
        if (!ok) return
      }
      try {
        await finalizeSubmit(session.attemptId, answers)
      } catch {
        /* alert di finalizeSubmit */
      }
    },
    [session?.attemptId, phase, submitting, questions.length, answeredCount, answers, finalizeSubmit],
  )

  useEffect(() => {
    if (phase !== 'exam') {
      prevRemainingRef.current = null
      return
    }
    const prev = prevRemainingRef.current
    prevRemainingRef.current = remainingSec
    if (prev != null && prev > 0 && remainingSec === 0 && !submitting && !autoSubmitFired.current) {
      autoSubmitFired.current = true
      void handleSubmit(true)
    }
  }, [phase, remainingSec, submitting, handleSubmit])

  useEffect(() => {
    if (phase !== 'exam') return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [phase])

  useEffect(() => {
    if (phase !== 'paper-error') return
    const s = getTryoutExamSession(tryoutId)
    if (!s?.attemptId) return
    const id = window.setInterval(() => {
      const cur = getTryoutExamSession(tryoutId)
      if (!cur?.attemptId) return
      const rem = getRemainingSecondsFromCachedExam(cur)
      if (rem !== null && rem <= 0) {
        window.clearInterval(id)
        setPhase('auto-submitting')
        const draft = loadDraft(tryoutId, cur.attemptId)
        void finalizeSubmit(cur.attemptId, draft, { quiet: true }).catch(() => {
          setPaperError((prev) => prev ?? 'Pengiriman jawaban otomatis gagal.')
          setPhase('paper-error')
        })
      }
    }, 1500)
    return () => window.clearInterval(id)
  }, [phase, tryoutId, finalizeSubmit])

  if (phase === 'init') {
    return <div className="py-12 text-center text-gray-500 text-sm">Memuat…</div>
  }

  if (phase === 'missing-session') {
    return (
      <div className="max-w-lg">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Sesi ujian tidak ditemukan</h1>
        <p className="text-sm text-gray-600 mb-6">
          Buka halaman detail tryout dan pilih <strong>Mulai Ujian</strong> lagi. Jika Anda menutup tab sebelumnya, sesi mungkin
          perlu dimulai ulang dari sana.
        </p>
        <a
          href={backHref}
          className="inline-flex px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover"
        >
          Kembali ke detail tryout
        </a>
      </div>
    )
  }

  if (phase === 'iframe-only' && session?.examUrl) {
    return (
      <div className="flex flex-col -m-8 gap-0">
        <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">Pengerjaan tryout</p>
          <a href={backHref} className="text-sm font-medium text-primary hover:underline">
            ← Kembali ke detail tryout
          </a>
        </div>
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
          Ujian dibuka di penyedia eksternal. Skor dan riwayat di dashboard LMS hanya terisi otomatis jika backend juga
          mengisi attempt lewat API yang sama dengan alur soal internal (ada <code className="text-[11px]">attemptId</code>).
        </p>
        <div className="bg-slate-100 p-2 sm:p-3">
          <iframe
            title="Ujian tryout"
            src={session.examUrl}
            className="w-full min-h-[min(85dvh,56rem)] rounded-lg border border-gray-200 bg-white shadow-sm"
            allow="fullscreen; clipboard-read; clipboard-write"
          />
        </div>
      </div>
    )
  }

  if (phase === 'loading-paper') {
    return (
      <div className="py-12 text-center text-gray-500 text-sm">
        Memuat soal…
      </div>
    )
  }

  if (phase === 'auto-submitting') {
    return (
      <div className="max-w-lg mx-auto py-16 text-center px-4">
        <p className="text-sm font-semibold text-gray-900 mb-2">Menyelesaikan ujian…</p>
        <p className="text-sm text-gray-600">
          Mengirim jawaban tersimpan (cache). Ini terjadi jika waktu habis atau pengiriman wajib dilakukan.
        </p>
      </div>
    )
  }

  if (phase === 'paper-error' && session) {
    const remErr =
      session.attemptId != null ? getRemainingSecondsFromCachedExam(session) : null
    const waktuHabis = remErr !== null && remErr <= 0
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Soal belum bisa dimuat</h1>
        <p className="text-sm text-gray-600">{paperError ?? 'Terjadi kesalahan.'}</p>
        {waktuHabis ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Waktu ujian menurut cache sudah habis. Gunakan tombol di bawah untuk mengirim jawaban tersimpan.
          </p>
        ) : null}
        <p className="text-xs text-gray-500">
          Pastikan backend menyediakan{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">GET /attempts/&#123;attemptId&#125;/questions</code>
          (Bearer siswa). Fallback lama: paper pada namespace siswa. Untuk demo lokal:{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">VITE_TRYOUT_EXAM_MOCK=true</code>.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover"
            onClick={() => {
              setPhase('loading-paper')
              setPaperError(null)
              if (!session.attemptId) return
              getStudentTryoutAttemptPaper(tryoutId, session.attemptId)
                .then((p) => {
                  setPaper(p)
                  setAnswers(mergeServerAndDraftAnswers(p, tryoutId, session.attemptId!))
                  setPhase('exam')
                })
                .catch((err) => {
                  setPaperError(err instanceof ApiError ? err.message : 'Gagal memuat soal.')
                  setPhase('paper-error')
                })
            }}
          >
            Coba lagi
          </button>
          {waktuHabis ? (
            <button
              type="button"
              className="inline-flex px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover"
              onClick={() => {
                const cur = getTryoutExamSession(tryoutId)
                if (!cur?.attemptId) return
                setPhase('auto-submitting')
                const draft = loadDraft(tryoutId, cur.attemptId)
                void finalizeSubmit(cur.attemptId, draft, { quiet: true }).catch(() => {
                  setPaperError('Gagal mengirim jawaban dari cache.')
                  setPhase('paper-error')
                })
              }}
            >
              Kirim jawaban dari cache
            </button>
          ) : null}
          {session.examUrl ? (
            <a
              href={session.examUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Buka ujian di tab baru
            </a>
          ) : null}
          <a href={backHref} className="inline-flex px-4 py-2.5 rounded-xl text-sm font-medium text-primary hover:underline">
            Kembali ke detail
          </a>
        </div>
      </div>
    )
  }

  if (phase === 'submitted' && submitResult) {
    const displayMaxScore = attemptHydration?.maxScore ?? submitResult.maxScore ?? 0
    return (
      <TryoutAttemptResultView
        heading="Jawaban terkirim"
        score={submitResult.score}
        displayMaxScore={displayMaxScore}
        percentile={submitResult.percentile}
        feedback={submitResult.feedback}
        message={submitResult.message}
        graded={submitResult.graded}
        gradingStatus={submitResult.gradingStatus}
        reviewRows={reviewRows}
        reviewLoading={reviewLoading}
        paperQuestions={paper?.questions ?? []}
        attemptHydrationModuleAnalysis={attemptHydration?.moduleAnalysis}
        submitModuleAnalysis={submitResult.moduleAnalysis ?? submitResult.moduleSummary}
        attemptHydrationOverallAnalysis={attemptHydration?.overallAnalysis}
        submitOverallAnalysis={submitResult.overallAnalysis}
        tryoutId={tryoutId}
        backHref={backHref}
        backLabel="Kembali ke detail tryout"
        showStaleSubmitHint
      />
    )
  }

  if (phase !== 'exam' || !paper || !session?.attemptId || !currentQuestion) {
    return null
  }

  const isMock = import.meta.env.VITE_TRYOUT_EXAM_MOCK === 'true'

  return (
    <div className="flex flex-col -m-8 gap-0 min-h-[calc(100vh-8rem)]">
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{paper.title ?? 'Pengerjaan tryout'}</p>
          <p className="text-xs text-gray-500">
            {answeredCount}/{questions.length} dijawab · Sisa waktu{' '}
            <span className={remainingSec <= 300 ? 'font-semibold text-amber-700' : 'font-medium text-gray-700'}>
              {formatCountdown(remainingSec)}
            </span>
            {!isMock ? <span className="text-gray-400"> · Soal & waktu dari API</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isMock ? (
            <span className="text-xs rounded-full bg-amber-100 text-amber-900 px-2.5 py-1">Mode demo soal lokal</span>
          ) : null}
          <a href={backHref} className="text-sm font-medium text-gray-500 hover:text-primary hover:underline">
            Detail tryout
          </a>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit(false)}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? 'Mengirim…' : 'Kirim jawaban'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row gap-4 p-4 bg-slate-50">
        <aside className="lg:w-52 shrink-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nomor soal</p>
          <div className="flex flex-wrap lg:flex-col gap-1.5 max-h-48 lg:max-h-[min(70vh,32rem)] overflow-y-auto">
            {questions.map((q, i) => {
              const filled = Boolean(answers[q.id])
              const active = i === currentIndex
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium border transition-colors ${
                    active
                      ? 'bg-primary text-white border-primary'
                      : filled
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </aside>

        <main className="flex-1 min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Soal {currentIndex + 1} dari {questions.length}</p>
          {currentQuestion.bodyHtml || currentQuestion.imageUrl ? (
            <div className="mb-4">
              <QuestionBody html={currentQuestion.bodyHtml ?? ''} imageUrl={currentQuestion.imageUrl} />
            </div>
          ) : null}
          {currentQuestion.prompt ? (
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 whitespace-pre-wrap mb-6">
              {currentQuestion.prompt}
            </h2>
          ) : null}

          {currentQuestion.questionType === 'short' ? (
            <div className="space-y-2">
              <label htmlFor={`short-${currentQuestion.id}`} className="block text-sm font-medium text-gray-700">
                Jawaban singkat
              </label>
              <input
                id={`short-${currentQuestion.id}`}
                type="text"
                value={answers[currentQuestion.id] ?? ''}
                onChange={(e) => setAnswerText(currentQuestion.id, e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder="Ketik jawaban…"
                autoComplete="off"
              />
            </div>
          ) : (
            <fieldset className="space-y-3">
              <legend className="sr-only">Pilih jawaban</legend>
              {currentQuestion.options.map((opt) => {
                const id = `${currentQuestion.id}-${opt.key}`
                const checked = answers[currentQuestion.id] === opt.key
                return (
                  <label
                    key={opt.key}
                    htmlFor={id}
                    className={`flex gap-3 cursor-pointer rounded-xl border p-3 text-sm transition-colors ${
                      checked ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      id={id}
                      type="radio"
                      name={currentQuestion.id}
                      value={opt.key}
                      checked={checked}
                      onChange={() => setAnswer(currentQuestion.id, opt.key)}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <span>
                      <span className="font-semibold text-gray-900">{opt.key}.</span>{' '}
                      <span className="text-gray-700">{opt.label}</span>
                    </span>
                  </label>
                )
              })}
            </fieldset>
          )}

          <div className="mt-8 flex flex-wrap justify-between gap-3">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40"
            >
              ← Sebelumnya
            </button>
            <button
              type="button"
              disabled={currentIndex >= questions.length - 1}
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40"
            >
              Berikutnya →
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

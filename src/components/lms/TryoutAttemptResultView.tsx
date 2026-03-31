import { useMemo } from 'react'
import type { TryoutAttemptReviewRow, TryoutOverallAnalysis } from '../../lib/api'
import { formatTryoutStatistic } from '../../utils/formatTryoutDisplay'
import {
  buildTryoutModuleStats,
  pctCorrect,
  tryoutModuleInsight,
  tryoutModuleServerStatsUninformative,
  tryoutOverallStudyHint,
  type TryoutModuleStat,
} from '../../utils/tryoutModuleAnalysis'
import { resolveTryoutReviewDisplay } from '../../utils/tryoutReviewGrading'

export type TryoutAttemptResultPaperQuestion = { id: string; moduleKey?: string; moduleLabel?: string }

export interface TryoutAttemptResultViewProps {
  heading: string
  subtitle?: string
  submittedAtLabel?: string
  score?: number
  displayMaxScore: number
  /** Absen = field tidak dikirim API; UI menampilkan “belum tersedia”. */
  percentile?: number
  feedback?: string
  message?: string
  thanksFallback?: string
  graded?: boolean
  gradingStatus?: string
  reviewRows: TryoutAttemptReviewRow[] | null
  reviewLoading: boolean
  paperQuestions?: TryoutAttemptResultPaperQuestion[]
  /** Dari GET /student/attempts/:id (hydrasi) */
  attemptHydrationModuleAnalysis?: TryoutModuleStat[] | null
  /** Dari body submit (halaman ujian) */
  submitModuleAnalysis?: TryoutModuleStat[] | null
  /** Analisis agregat dari GET attempt (prioritas di atas submit). */
  attemptHydrationOverallAnalysis?: TryoutOverallAnalysis | null
  /** Analisis agregat dari respons submit. */
  submitOverallAnalysis?: TryoutOverallAnalysis | null
  tryoutId: string
  backHref: string
  backLabel: string
  /** Hanya alur baru selesai submit: tampilkan catatan skor 0 dari API */
  showStaleSubmitHint?: boolean
}

export function TryoutAttemptResultView({
  heading,
  subtitle,
  submittedAtLabel,
  score,
  displayMaxScore,
  percentile,
  feedback,
  message,
  thanksFallback = 'Terima kasih telah mengerjakan tryout ini.',
  graded,
  gradingStatus,
  reviewRows,
  reviewLoading,
  paperQuestions = [],
  attemptHydrationModuleAnalysis,
  submitModuleAnalysis,
  attemptHydrationOverallAnalysis,
  submitOverallAnalysis,
  tryoutId,
  backHref,
  backLabel,
  showStaleSubmitHint = false,
}: TryoutAttemptResultViewProps) {
  const gradingPending =
    graded === false ||
    /\bpending\b/i.test(gradingStatus ?? '') ||
    /\bprocessing\b/i.test(gradingStatus ?? '')

  const serverOverallAnalysis = useMemo((): TryoutOverallAnalysis | null => {
    const has = (x: TryoutOverallAnalysis | null | undefined) =>
      Boolean(x) &&
      Boolean(
        (x!.summary && x!.summary.trim()) ||
          x!.totalQuestions != null ||
          x!.answeredCount != null ||
          x!.unansweredCount != null ||
          x!.correctCount != null ||
          x!.wrongCount != null ||
          x!.autoUngradedCount != null ||
          x!.scorePercent != null ||
          x!.scoreGot != null ||
          x!.maxScore != null ||
          (x!.byQuestionType && x!.byQuestionType.length > 0),
      )
    const fromAttempt = attemptHydrationOverallAnalysis
    const fromSubmit = submitOverallAnalysis
    if (has(fromAttempt)) return fromAttempt!
    if (has(fromSubmit)) return fromSubmit!
    return null
  }, [attemptHydrationOverallAnalysis, submitOverallAnalysis])

  const { moduleStats, replacedServerModuleWithClient } = useMemo(() => {
    const fromAttempt = attemptHydrationModuleAnalysis
    const fromSubmit = submitModuleAnalysis
    const serverFirst =
      fromAttempt && fromAttempt.length > 0
        ? fromAttempt
        : fromSubmit && fromSubmit.length > 0
          ? fromSubmit
          : null
    const clientBuilt = buildTryoutModuleStats(paperQuestions, reviewRows)
    const clientHasGrades = clientBuilt.some((r) => r.correct + r.wrong > 0)
    if (serverFirst && tryoutModuleServerStatsUninformative(serverFirst) && clientHasGrades) {
      return { moduleStats: clientBuilt, replacedServerModuleWithClient: true }
    }
    if (serverFirst) {
      return { moduleStats: serverFirst, replacedServerModuleWithClient: false }
    }
    return { moduleStats: clientBuilt, replacedServerModuleWithClient: false }
  }, [attemptHydrationModuleAnalysis, submitModuleAnalysis, paperQuestions, reviewRows])

  const moduleInsightText = useMemo(() => tryoutModuleInsight(moduleStats), [moduleStats])
  const overallHint = useMemo(() => tryoutOverallStudyHint(score, displayMaxScore), [score, displayMaxScore])

  const hadServerModulePayload =
    Boolean(attemptHydrationModuleAnalysis?.length) || Boolean(submitModuleAnalysis && submitModuleAnalysis.length > 0)
  const serverModuleTable = hadServerModulePayload && !replacedServerModuleWithClient

  const percentileLooksPlaceholder =
    percentile != null &&
    Number.isFinite(percentile) &&
    percentile === 0 &&
    score != null &&
    score > 0

  const showPercentileRow = score != null || displayMaxScore > 0

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{heading}</h1>
        {subtitle ? <p className="text-sm text-gray-600 mt-1">{subtitle}</p> : null}
        {submittedAtLabel ? (
          <p className="text-xs text-gray-500 mt-1">Dikirim: {submittedAtLabel}</p>
        ) : null}
      </div>

      {gradingPending ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Penilaian dari server mungkin belum final. Skor dan persentil di bawah bisa berubah — cek lagi nanti di{' '}
          <a href="#/student/tryout/history" className="font-medium text-amber-950 underline hover:no-underline">
            Riwayat tryout
          </a>
          .
        </div>
      ) : null}

      {score != null && Number.isFinite(score) ? (
        <p className="text-sm text-gray-700">
          Skor:{' '}
          <span className="font-semibold text-gray-900">{formatTryoutStatistic(score)}</span>
          {displayMaxScore > 0 ? (
            <>
              {' '}
              <span className="text-gray-500 font-normal">/ {formatTryoutStatistic(displayMaxScore)}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {showPercentileRow ? (
        <p className="text-sm text-gray-700">
          Persentil:{' '}
          {percentile != null && Number.isFinite(percentile) ? (
            percentileLooksPlaceholder ? (
              <span className="text-gray-600 font-normal">
                belum tersedia — perbandingan dengan peserta lain belum dihitung di server (bukan 0% hasil ujian).
              </span>
            ) : (
              <span className="font-semibold text-gray-900">{formatTryoutStatistic(percentile)}%</span>
            )
          ) : (
            <span className="text-gray-600 font-normal">
              belum tersedia — field ini opsional di API; akan muncul setelah server menghitung perbandingan dalam tryout
              yang sama (minimal dua skor).
            </span>
          )}
        </p>
      ) : null}

      {showStaleSubmitHint &&
      !gradingPending &&
      score === 0 &&
      percentile != null &&
      percentile === 0 &&
      graded !== true ? (
        <p className="text-xs text-gray-500">
          Skor dan persentil di atas mengikuti respons API saat submit. Jika backend belum mengirim nilai final, angka bisa
          tetap 0 sampai server diperbarui.
        </p>
      ) : null}

      {serverOverallAnalysis ? (
        <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white px-4 py-3 text-sm text-gray-800 shadow-sm">
          <p className="font-semibold text-gray-900 mb-2">Analisis keseluruhan</p>
          {serverOverallAnalysis.summary ? (
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap mb-3">{serverOverallAnalysis.summary}</p>
          ) : null}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
            {serverOverallAnalysis.totalQuestions != null ? (
              <span>
                Total soal:{' '}
                <span className="font-medium text-gray-900 tabular-nums">
                  {formatTryoutStatistic(serverOverallAnalysis.totalQuestions)}
                </span>
              </span>
            ) : null}
            {serverOverallAnalysis.answeredCount != null ? (
              <span>
                Terjawab:{' '}
                <span className="font-medium text-gray-900 tabular-nums">
                  {formatTryoutStatistic(serverOverallAnalysis.answeredCount)}
                </span>
              </span>
            ) : null}
            {serverOverallAnalysis.unansweredCount != null ? (
              <span>
                Tidak dijawab:{' '}
                <span className="font-medium text-gray-900 tabular-nums">
                  {formatTryoutStatistic(serverOverallAnalysis.unansweredCount)}
                </span>
              </span>
            ) : null}
            {serverOverallAnalysis.correctCount != null ? (
              <span>
                Benar:{' '}
                <span className="font-medium text-emerald-800 tabular-nums">
                  {formatTryoutStatistic(serverOverallAnalysis.correctCount)}
                </span>
              </span>
            ) : null}
            {serverOverallAnalysis.wrongCount != null ? (
              <span>
                Salah:{' '}
                <span className="font-medium text-rose-800 tabular-nums">
                  {formatTryoutStatistic(serverOverallAnalysis.wrongCount)}
                </span>
              </span>
            ) : null}
            {serverOverallAnalysis.autoUngradedCount != null ? (
              <span>
                Belum dinilai otomatis:{' '}
                <span className="font-medium text-amber-900 tabular-nums">
                  {formatTryoutStatistic(serverOverallAnalysis.autoUngradedCount)}
                </span>
              </span>
            ) : null}
            {serverOverallAnalysis.scorePercent != null && Number.isFinite(serverOverallAnalysis.scorePercent) ? (
              <span>
                Persen skor:{' '}
                <span className="font-medium text-gray-900 tabular-nums">
                  {formatTryoutStatistic(serverOverallAnalysis.scorePercent)}%
                </span>
              </span>
            ) : null}
            {serverOverallAnalysis.scoreGot != null || serverOverallAnalysis.maxScore != null ? (
              <span>
                Skor:{' '}
                <span className="font-medium text-gray-900 tabular-nums">
                  {serverOverallAnalysis.scoreGot != null ? formatTryoutStatistic(serverOverallAnalysis.scoreGot) : '—'}
                  {serverOverallAnalysis.maxScore != null && serverOverallAnalysis.maxScore > 0 ? (
                    <span className="text-gray-500 font-normal">
                      {' '}
                      / {formatTryoutStatistic(serverOverallAnalysis.maxScore)}
                    </span>
                  ) : null}
                </span>
              </span>
            ) : null}
          </div>
          {serverOverallAnalysis.byQuestionType && serverOverallAnalysis.byQuestionType.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-emerald-100 bg-white/80">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-slate-50/80 text-left text-gray-600">
                    <th className="py-2 px-3 font-medium">Jenis soal</th>
                    <th className="py-2 px-2 font-medium text-right">Jumlah</th>
                    <th className="py-2 px-2 font-medium text-right">Benar</th>
                    <th className="py-2 px-2 font-medium text-right">Salah</th>
                    <th className="py-2 px-2 font-medium text-right whitespace-nowrap">Belum nilai</th>
                    <th className="py-2 px-3 font-medium text-right whitespace-nowrap">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {serverOverallAnalysis.byQuestionType.map((row, i) => (
                    <tr key={`${row.questionTypeLabel ?? 't'}-${i}`} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 px-3 font-medium text-gray-900">
                        {row.questionTypeLabel?.trim() || '—'}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-700">
                        {row.total != null ? formatTryoutStatistic(row.total) : '—'}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-emerald-700">
                        {row.correct != null ? formatTryoutStatistic(row.correct) : '—'}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-rose-700">
                        {row.wrong != null ? formatTryoutStatistic(row.wrong) : '—'}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-amber-800">
                        {row.unscored != null ? formatTryoutStatistic(row.unscored) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-900">
                        {row.scoreGot != null ? formatTryoutStatistic(row.scoreGot) : '—'}
                        {row.maxScore != null && row.maxScore > 0 ? (
                          <span className="text-gray-500 font-normal">
                            {' '}
                            / {formatTryoutStatistic(row.maxScore)}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {overallHint ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-gray-800">
          <p className="font-semibold text-gray-900 mb-1">Rekomendasi belajar</p>
          <p className="text-gray-700 leading-relaxed">{overallHint}</p>
        </div>
      ) : null}

      {feedback ? <p className="text-sm text-gray-600 whitespace-pre-wrap">{feedback}</p> : null}
      {message ? (
        <p className="text-sm text-gray-600">{message}</p>
      ) : (
        <p className="text-sm text-gray-600">{thanksFallback}</p>
      )}

      {moduleStats.length > 0 ? (
        <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/5 to-white px-4 py-3 text-sm text-gray-800 shadow-sm">
          <p className="font-semibold text-gray-900 mb-1">Analisis per modul / topik</p>
          <p className="text-xs text-gray-600 mb-3">
            {replacedServerModuleWithClient
              ? 'Ringkasan di bawah dihitung dari skor per soal: penuh = benar, di bawah penuh = salah (tampilan untuk siswa, bukan skor parsial).'
              : serverModuleTable
                ? 'Ringkasan per modul dari data server.'
                : 'Ringkasan dari metadata soal dan hasil penilaian per soal dari server.'}
          </p>
          {moduleInsightText ? (
            <p className="text-sm text-gray-800 mb-3 leading-relaxed border-l-2 border-primary/40 pl-3">{moduleInsightText}</p>
          ) : reviewLoading ? null : replacedServerModuleWithClient ? null : serverModuleTable ? (
            <p className="text-xs text-slate-600 bg-slate-100/80 border border-slate-200 rounded-lg px-3 py-2 mb-3">
              Saran latihan tambahan muncul otomatis jika tabel sudah memuat jumlah benar dan salah per modul.
            </p>
          ) : (
            <p className="text-xs text-amber-800 bg-amber-50/80 border border-amber-100 rounded-lg px-3 py-2 mb-3">
              Untuk rekomendasi otomatis per modul, pastikan pembahasan dari server memuat status benar/salah atau skor per
              soal.
            </p>
          )}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50 text-left text-gray-600">
                  <th className="py-2.5 px-3 font-medium">Modul / topik</th>
                  <th className="py-2.5 px-2 font-medium text-right">Benar</th>
                  <th className="py-2.5 px-2 font-medium text-right">Salah</th>
                  <th className="py-2.5 px-2 font-medium text-right whitespace-nowrap">Belum dinilai</th>
                  <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">% benar*</th>
                </tr>
              </thead>
              <tbody>
                {moduleStats.map((row) => {
                  const pct = pctCorrect(row)
                  return (
                    <tr key={row.moduleKey} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 px-3 font-medium text-gray-900">{row.moduleLabel}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-emerald-700">{row.correct}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-rose-700">{row.wrong}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-500">{row.unknown}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-900">{pct != null ? `${pct}%` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            *Persentase dari soal yang sudah dinilai (benar atau salah).{' '}
            {replacedServerModuleWithClient
              ? 'Angka dihitung ulang di aplikasi dari skor tiap soal karena ringkasan server belum memuat benar/salah.'
              : serverModuleTable
                ? 'Angka per modul mengikuti data server.'
                : 'Grup modul diambil dari metadata soal (module, bidang, tags).'}
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-slate-50/80 px-4 py-3 text-sm text-gray-700">
        <p className="font-medium text-gray-900 mb-1">Pembahasan per soal</p>
        {reviewLoading ? (
          <p className="text-gray-500 text-xs">Memuat pembahasan dari server…</p>
        ) : reviewRows && reviewRows.length > 0 ? (
          <ul className="mt-2 space-y-3 text-xs sm:text-sm">
            {reviewRows.map((r, idx) => {
              const disp = resolveTryoutReviewDisplay(r)
              const showScoreLine =
                disp.ungradedAutomatic ||
                disp.displayGot != null ||
                (disp.displayMax != null && disp.displayMax > 0)
              return (
                <li key={r.questionId} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="font-semibold text-gray-900">
                    Soal {r.order ?? idx + 1}
                    {r.questionTypeLabel ? (
                      <span className="ml-2 text-gray-500 font-normal text-sm">({r.questionTypeLabel})</span>
                    ) : null}
                    {disp.labelCorrect === true ? (
                      <span className="ml-2 text-emerald-600 font-normal">· Benar</span>
                    ) : disp.labelCorrect === false ? (
                      <span className="ml-2 text-rose-600 font-normal">· Salah</span>
                    ) : disp.ungradedAutomatic ? (
                      <span className="ml-2 text-amber-700 font-normal">· Belum dinilai otomatis</span>
                    ) : (
                      <span className="ml-2 text-amber-700 font-normal">· Belum dinilai</span>
                    )}
                  </p>
                  {r.analysisSummary ? (
                    <p className="text-sm text-gray-700 mt-1 italic border-l-2 border-primary/30 pl-2">{r.analysisSummary}</p>
                  ) : null}
                  {r.analysisDetail ? (
                    <p className="text-sm text-gray-800 mt-2 leading-relaxed whitespace-pre-wrap border-l-2 border-slate-200 pl-3">
                      {r.analysisDetail}
                    </p>
                  ) : null}
                  {showScoreLine ? (
                    <p className="text-gray-700 mt-1 text-xs">
                      <span className="text-gray-500">Skor soal: </span>
                      {disp.ungradedAutomatic ? (
                        <span className="text-amber-900">
                          Belum dinilai otomatis — biasanya soal belum punya kunci (correctOption / correctText) di bank
                          soal.
                        </span>
                      ) : (
                        <>
                          {disp.displayGot != null ? formatTryoutStatistic(disp.displayGot) : '—'}
                          {disp.displayMax != null && disp.displayMax > 0 ? (
                            <span className="text-gray-500"> / {formatTryoutStatistic(disp.displayMax)}</span>
                          ) : null}
                        </>
                      )}
                    </p>
                  ) : null}
                  {r.moduleTitle || r.bidang || (r.tags && r.tags.length > 0) ? (
                    <p className="text-[11px] text-gray-500 mt-1">
                      {[r.moduleTitle, r.bidang].filter(Boolean).join(' · ')}
                      {r.tags && r.tags.length > 0
                        ? `${r.moduleTitle || r.bidang ? ' · ' : ''}${r.tags.join(', ')}`
                        : null}
                    </p>
                  ) : null}
                  {r.prompt ? <p className="text-gray-600 mt-1 whitespace-pre-wrap">{r.prompt}</p> : null}
                  {r.yourAnswer ? (
                    <p className="text-gray-700 mt-1">
                      <span className="text-gray-500">Jawaban Anda: </span>
                      {r.yourAnswer}
                    </p>
                  ) : null}
                  {r.correctAnswer ? (
                    <p className="text-gray-800 mt-1">
                      <span className="text-gray-500">Kunci / jawaban benar: </span>
                      {r.correctAnswer}
                    </p>
                  ) : null}
                  {r.explanation ? (
                    <p className="text-gray-600 mt-2 whitespace-pre-wrap border-t border-gray-100 pt-2">{r.explanation}</p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">
            Belum ada pembahasan per soal untuk percobaan ini. Data biasanya tersedia lewat{' '}
            <code className="rounded bg-white px-1 py-0.5 text-[11px]">GET /student/attempts/&#123;id&#125;</code> (field{' '}
            <code className="text-[11px]">review</code>). Jika kosong, minta admin memastikan backend mengirim review setelah
            submit.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <a
          href={backHref}
          className="inline-flex px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover"
        >
          {backLabel}
        </a>
        {tryoutId.trim() ? (
          <a
            href={`#/student/leaderboard/${encodeURIComponent(tryoutId)}`}
            className="inline-flex px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            Lihat leaderboard
          </a>
        ) : null}
        <a
          href="#/student/tryout/history"
          className="inline-flex px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Riwayat tryout
        </a>
      </div>
    </div>
  )
}

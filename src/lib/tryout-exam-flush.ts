import { putAttemptAnswer } from './api'

/** Kirim semua jawaban cache ke server (PUT per soal) sebelum submit akhir. */
export async function flushTryoutAnswersToServer(
  attemptId: string,
  answers: Record<string, string>,
): Promise<void> {
  if (import.meta.env.VITE_TRYOUT_EXAM_MOCK === 'true') return
  const entries = Object.entries(answers).filter(([, v]) => typeof v === 'string' && v.trim())
  await Promise.all(
    entries.map(([qid, v]) => {
      const t = v.trim()
      const mcq = /^[A-E]$/i.test(t) && t.length === 1
      return putAttemptAnswer(
        attemptId,
        qid,
        mcq ? { selectedOption: t.toUpperCase() } : { answerText: t },
      )
    }),
  )
}

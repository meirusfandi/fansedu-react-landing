/**
 * Soal demo untuk `VITE_TRYOUT_EXAM_MOCK=true` — sumber teks: `tryoutExamSampleExport.json` (bisa disalin ke admin).
 */
import tryoutExamSampleExport from './tryoutExamSampleExport.json'

type SampleQuestion = (typeof tryoutExamSampleExport.questions)[number]

export const TRYOUT_EXAM_MOCK_META = {
  title: tryoutExamSampleExport.title,
  durationMinutes: tryoutExamSampleExport.durationMinutes,
} as const

/** Hanya field yang dipakai renderer ujian mock (tanpa kunci jawaban). */
export const TRYOUT_EXAM_MOCK_QUESTIONS: Array<{
  id: string
  prompt: string
  options: { key: string; label: string }[]
}> = tryoutExamSampleExport.questions.map((q: SampleQuestion) => ({
  id: q.id,
  prompt: q.prompt,
  options: q.options,
}))

/** Untuk skrip admin / impor: salin `tryoutExamSampleExport.json` dari repo. */
export { tryoutExamSampleExport as tryoutExamSamplePaperJson }

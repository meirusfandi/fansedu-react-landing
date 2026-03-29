/**
 * Kontrak BE: PG/isian berkunci = skor biner (benar = penuh, salah/kosong = 0).
 * isCorrect === null + scoreGot === 0 = belum dinilai otomatis (mis. soal tanpa kunci), bukan “salah”.
 */

const SCORE_FULL_EPS = 1e-4

export type TryoutReviewGradingInput = {
  isCorrect?: boolean | null
  scoreGot?: number
  maxScore?: number
}

/** null = belum dinilai / tidak disimpulkan; true/false = eksplisit atau disimpulkan dari skor penuh vs biner salah. */
export function effectiveTryoutQuestionCorrect(row: TryoutReviewGradingInput): boolean | null {
  if (row.isCorrect === true) return true
  if (row.isCorrect === false) return false
  const max = row.maxScore
  const got = row.scoreGot
  if (max != null && max > 0 && got != null && Number.isFinite(got)) {
    if (got + SCORE_FULL_EPS >= max) return true
    if (got <= SCORE_FULL_EPS) return null
    return false
  }
  if (got != null && Number.isFinite(got) && got <= SCORE_FULL_EPS) return null
  return null
}

export function resolveTryoutReviewDisplay(row: TryoutReviewGradingInput): {
  labelCorrect: boolean | null
  displayGot: number | null
  displayMax: number | null
  /** true: isCorrect null + scoreGot 0 (+ max), tampilkan “belum dinilai otomatis”, jangan 0/max sebagai salah */
  ungradedAutomatic?: boolean
} {
  const max = row.maxScore != null && row.maxScore > 0 ? row.maxScore : null
  const got = row.scoreGot != null && Number.isFinite(row.scoreGot) ? row.scoreGot : null
  const eff = effectiveTryoutQuestionCorrect(row)

  if (eff === true) {
    return { labelCorrect: true, displayGot: max ?? got, displayMax: max }
  }
  if (eff === false) {
    if (max != null) return { labelCorrect: false, displayGot: 0, displayMax: max }
    return { labelCorrect: false, displayGot: got, displayMax: null }
  }
  const inferredUngraded =
    row.isCorrect !== true &&
    row.isCorrect !== false &&
    got != null &&
    got <= SCORE_FULL_EPS &&
    max != null
  if (inferredUngraded) {
    return { labelCorrect: null, displayGot: null, displayMax: max, ungradedAutomatic: true }
  }
  return { labelCorrect: null, displayGot: got, displayMax: max }
}

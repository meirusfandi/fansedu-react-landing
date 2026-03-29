/**
 * Aturan tampilan tryout untuk siswa: daftar hanya tryout yang belum lewat close date (jika API mengirim closeAt).
 */
export function isTryoutWindowOpen(t: { closeAt?: string }): boolean {
  const raw = (t.closeAt ?? '').trim()
  if (!raw) return true
  const end = new Date(raw)
  if (Number.isNaN(end.getTime())) return true
  return Date.now() <= end.getTime()
}

export function filterStudentVisibleTryouts<T extends { closeAt?: string }>(tryouts: T[]): T[] {
  return tryouts.filter(isTryoutWindowOpen)
}

/** True jika ada batas waktu dan sudah lewat (tidak valid untuk daftar). */
export function isPastDeadline(iso?: string): boolean {
  const raw = (iso ?? '').trim()
  if (!raw) return false
  const t = new Date(raw)
  if (Number.isNaN(t.getTime())) return false
  return Date.now() > t.getTime()
}

/**
 * True jika waktu mulai ujian (opensAt / startAt dari API) sudah tiba.
 * Tanpa tanggal valid dari server → true (jangan blokir; kompatibel data lama).
 */
export function hasTryoutStartTimeArrived(t: { startAt?: string }): boolean {
  const raw = (t.startAt ?? '').trim()
  if (!raw) return true
  const start = new Date(raw)
  if (Number.isNaN(start.getTime())) return true
  return Date.now() >= start.getTime()
}

function normalizeTryoutStatusToken(s: string): string {
  return s.trim().toUpperCase().replace(/-/g, '_')
}

/**
 * True jika sinyal dari GET …/status hanya menjelaskan bahwa **ujian belum boleh dimulai** (jadwal),
 * bukan bahwa **pendaftaran** ditutup. Dipakai agar UI tetap menampilkan tombol Daftar sebelum opensAt.
 */
const EXAM_NOT_YET_OPEN_CODES = new Set([
  'BEFORE_OPENS_AT',
  'BEFORE_OPEN_AT',
  'BEFORE_OPEN',
  'NOT_YET_OPEN',
  'EXAM_NOT_STARTED',
  'TRYOUT_NOT_STARTED',
])

export function isTryoutExamNotYetOpenStatusSignal(
  startDisabledReason?: string,
  tryoutStatus?: string,
): boolean {
  const tokens: string[] = []
  if (startDisabledReason) tokens.push(normalizeTryoutStatusToken(startDisabledReason))
  if (tryoutStatus) tokens.push(normalizeTryoutStatusToken(tryoutStatus))
  return tokens.some((c) => EXAM_NOT_YET_OPEN_CODES.has(c))
}

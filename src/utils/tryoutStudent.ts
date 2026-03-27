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

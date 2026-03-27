/**
 * Daftar tryout yang terbuka (open). Nantinya bisa dari API GET /tryouts?status=open.
 */

export interface TryoutOpenItem {
  id: string
  title: string
  /** Waktu mulai tryout (ISO string), contoh: 2026-03-05T13:00:00+07:00 */
  startAt: string
  /** Interval dalam hari (2 minggu = 14) */
  intervalDays: number
  /** Deadline pendaftaran (ISO string) */
  registrationDeadlineAt?: string
  /** Link ke halaman detail tryout */
  detailPath: string
  /** Badge, e.g. "Gratis" */
  badge?: string
}

function formatDateTimeWib(iso: string): { dayName: string; dateText: string; timeText: string } {
  const d = new Date(iso)
  const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(d)
  const dateText = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(d)
  const timeText = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(d).replace(':', '.')
  return { dayName, dateText, timeText }
}

export function getTryoutScheduleText(t: Pick<TryoutOpenItem, 'startAt' | 'intervalDays'>): string {
  const iso = (t.startAt ?? '').trim()
  if (!iso) return 'Jadwal buka mengikuti pengumuman penyelenggara'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Jadwal buka mengikuti pengumuman penyelenggara'
  const { dayName, dateText, timeText } = formatDateTimeWib(iso)
  return `Dibuka ${dayName}, ${dateText}, ${timeText} WIB`
}

export function getTryoutCloseDateText(iso?: string): string | null {
  if (!iso?.trim()) return null
  const d = new Date(iso.trim())
  if (Number.isNaN(d.getTime())) return null
  const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(d)
  const dateText = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(d)
  const timeText = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(d).replace(':', '.')
  return `${dayName}, ${dateText}, ${timeText} WIB`
}

export function getTryoutRegistrationDeadlineText(iso?: string): string | null {
  if (!iso?.trim()) return null
  const d = new Date(iso.trim())
  if (Number.isNaN(d.getTime())) return null
  const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(d)
  const dateText = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(d)
  const timeText = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(d).replace(':', '.')
  return `${dayName}, ${dateText} pukul ${timeText} WIB`
}


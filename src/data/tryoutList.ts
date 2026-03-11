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
  const { dayName, dateText, timeText } = formatDateTimeWib(t.startAt)
  const weeks = Math.round(t.intervalDays / 7)
  const intervalText = weeks === 2 ? '2 minggu sekali' : `${t.intervalDays} hari sekali`
  return `${intervalText}, mulai ${dayName} ${dateText}, ${timeText} WIB`
}

export function getTryoutRegistrationDeadlineText(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(d)
  const dateText = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(d)
  const timeText = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(d).replace(':', '.')
  return `${dayName}, ${dateText} pukul ${timeText} WIB`
}

/** Tryout open yang tersedia — bisa diganti dengan fetch dari API */
export function getOpenTryouts(): TryoutOpenItem[] {
  return [
    {
      id: 'osn-2026',
      title: 'TryOut OSN Informatika 2026',
      startAt: '2026-03-05T13:00:00+07:00',
      intervalDays: 14,
      registrationDeadlineAt: '2026-03-04T23:59:00+07:00',
      detailPath: '#/tryout-info',
      badge: 'Gratis',
    },
  ]
}

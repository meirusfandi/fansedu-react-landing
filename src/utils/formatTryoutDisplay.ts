/** Tampilan skor / persentil / delta — id-ID, hingga 2 desimal tanpa nol berlebih. */
export function formatTryoutStatistic(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(value)
}

/** ISO datetime dari API → teks lokal singkat. */
export function formatTryoutDateTime(iso: string): string {
  const raw = (iso ?? '').trim()
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

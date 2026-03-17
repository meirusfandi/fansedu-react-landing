export function formatRupiah(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? Math.trunc(amount) : 0
  return `Rp${value.toLocaleString('id-ID')}`
}

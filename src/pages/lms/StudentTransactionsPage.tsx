import { useState, useEffect } from 'react'
import { getTransactions } from '../../lib/api'
import { ApiError } from '../../lib/api'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function StudentTransactionsPage() {
  const [data, setData] = useState<{ id: string; orderId: string; status: string; total: number; programs: { title: string }[]; paidAt: string }[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const PAGE_SIZE = 10

  useEffect(() => {
    setLoading(true)
    getTransactions({ page, limit: PAGE_SIZE, search: search.trim() || undefined, status: statusFilter })
      .then((res) => {
        setData(res.data || [])
        setTotal(typeof res.total === 'number' ? res.total : null)
        setTotalPages(typeof res.totalPages === 'number' ? res.totalPages : null)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat data.')
        setData([])
      })
      .finally(() => setLoading(false))
  }, [page, search, statusFilter])

  const safePage = Math.max(1, page)
  const totalPagesResolved = totalPages ?? 1
  const totalResolved = total ?? data.length

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  if (loading) return <div className="py-8 text-gray-500">Memuat...</div>
  if (error) return <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>

  const statusLabel = (s: string) => {
    const lower = s?.toLowerCase() ?? ''
    if (lower === 'paid') return 'Lunas'
    if (lower === 'pending') return 'Menunggu pembayaran'
    return s || '—'
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Riwayat Transaksi</h1>
      <div className="rounded-2xl border bg-white p-4 mb-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari kursus atau order ID..."
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending')}
          className="rounded-lg border px-4 py-2.5 text-sm md:w-[220px]"
        >
          <option value="all">Semua status</option>
          <option value="pending">Menunggu pembayaran</option>
          <option value="paid">Lunas</option>
        </select>
      </div>
      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Kursus</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Tanggal</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Jumlah</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Status</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-4 px-4">{r.programs?.map((p) => p.title).join(', ') || '-'}</td>
                <td className="py-4 px-4 text-gray-600">{formatDate(r.paidAt)}</td>
                <td className="py-4 px-4 font-medium">{formatRupiah(r.total)}</td>
                <td className="py-4 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                    {statusLabel(r.status)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  {(r.status?.toLowerCase() === 'pending') && r.orderId ? (
                    <a href={`#/checkout/confirm?order=${encodeURIComponent(r.orderId)}`} className="text-primary font-medium hover:underline text-xs sm:text-sm">
                      Upload bukti
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && <p className="text-gray-500 py-8">Belum ada transaksi yang sesuai filter.</p>}
      {totalPagesResolved > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Menampilkan {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, totalResolved)} dari {totalResolved} transaksi
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPagesResolved, p + 1))}
              disabled={safePage >= totalPagesResolved}
              className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

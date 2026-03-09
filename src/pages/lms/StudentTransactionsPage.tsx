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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTransactions()
      .then((res) => setData(res.data || []))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat data.')
        setData([])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-8 text-gray-500">Memuat...</div>
  if (error) return <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Transactions</h1>
      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Kursus</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Tanggal</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Jumlah</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-4 px-4">{r.programs?.map((p) => p.title).join(', ') || '-'}</td>
                <td className="py-4 px-4 text-gray-600">{formatDate(r.paidAt)}</td>
                <td className="py-4 px-4 font-medium">{formatRupiah(r.total)}</td>
                <td className="py-4 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && <p className="text-gray-500 py-8">Belum ada transaksi.</p>}
    </div>
  )
}

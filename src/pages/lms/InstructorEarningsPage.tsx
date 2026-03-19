import { useState, useEffect } from 'react'
import { getInstructorEarnings } from '../../lib/api'
import { ApiError } from '../../lib/api'

function formatPeriod(period: string) {
  try {
    const [y, m] = period.split('-')
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    const month = m ? monthNames[parseInt(m, 10) - 1] : period
    return `${month} ${y || ''}`.trim()
  } catch {
    return period
  }
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function InstructorEarningsPage() {
  const [data, setData] = useState<{ period: string; revenue: number; newStudents: number }[]>([])
  const [periodFilter, setPeriodFilter] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getInstructorEarnings()
      .then((res) => setData(res.data || []))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat data.')
        setData([])
      })
      .finally(() => setLoading(false))
  }, [])

  const periodOptions = Array.from(new Set(data.map((d) => d.period).filter(Boolean)))
  const courseOptions = Array.from(
    new Set(
      data
        .map((d) => ((d as unknown as { courseTitle?: string }).courseTitle || '').trim())
        .filter(Boolean)
    )
  )

  const filtered = data.filter((row) => {
    const byPeriod = periodFilter === 'all' || row.period === periodFilter
    const rowCourse = ((row as unknown as { courseTitle?: string }).courseTitle || '').trim()
    const byCourse = courseFilter === 'all' || rowCourse === courseFilter
    return byPeriod && byCourse
  })

  if (loading) return <div className="py-8 text-gray-500">Memuat...</div>
  if (error) return <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pendapatan</h1>
      <div className="rounded-2xl border bg-white p-4 mb-4 grid md:grid-cols-2 gap-3">
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="rounded-lg border px-4 py-2.5 text-sm"
        >
          <option value="all">Semua periode</option>
          {periodOptions.map((p) => (
            <option key={p} value={p}>{formatPeriod(p)}</option>
          ))}
        </select>
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="rounded-lg border px-4 py-2.5 text-sm"
        >
          <option value="all">Semua kursus</option>
          {courseOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Periode</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Pendapatan</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Siswa Baru</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-4 px-4 font-medium">{formatPeriod(r.period)}</td>
                <td className="py-4 px-4 text-primary font-semibold">{formatRupiah(r.revenue)}</td>
                <td className="py-4 px-4">{r.newStudents}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="text-gray-500 py-8">Belum ada data pendapatan yang sesuai filter.</p>}
    </div>
  )
}

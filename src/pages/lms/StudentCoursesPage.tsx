import { useState, useEffect } from 'react'
import { getMyCourses } from '../../lib/api'
import { ApiError } from '../../lib/api'

export default function StudentCoursesPage() {
  const [data, setData] = useState<{ id: string; program: { slug: string; title: string; thumbnail?: string }; progressPercent: number }[]>([])
  const [search, setSearch] = useState('')
  const [progressFilter, setProgressFilter] = useState<'all' | 'in-progress' | 'completed'>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const PAGE_SIZE = 6

  useEffect(() => {
    setLoading(true)
    getMyCourses({ page, limit: PAGE_SIZE, search: search.trim() || undefined, progressStatus: progressFilter })
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
  }, [page, search, progressFilter])

  const safePage = Math.max(1, page)
  const totalPagesResolved = totalPages ?? 1
  const totalResolved = total ?? data.length

  useEffect(() => {
    setPage(1)
  }, [search, progressFilter])

  if (loading) return <div className="py-8 text-gray-500">Memuat...</div>
  if (error) return <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Courses</h1>
      <div className="rounded-2xl border bg-white p-4 mb-6 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari course..."
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm"
        />
        <select
          value={progressFilter}
          onChange={(e) => setProgressFilter(e.target.value as 'all' | 'in-progress' | 'completed')}
          className="rounded-lg border px-4 py-2.5 text-sm md:w-[220px]"
        >
          <option value="all">Semua progress</option>
          <option value="in-progress">Sedang dipelajari</option>
          <option value="completed">Selesai</option>
        </select>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((item) => (
          <div key={item.id} className="rounded-2xl border bg-white overflow-hidden hover:shadow-md">
            <div className="aspect-video bg-slate-100 flex items-center justify-center text-3xl font-bold text-slate-300">
              {item.program.thumbnail ? <img src={item.program.thumbnail} alt="" className="w-full h-full object-cover" /> : item.program.title.charAt(0)}
            </div>
            <div className="p-4">
              <h2 className="font-semibold text-gray-900 mb-2 line-clamp-2">{item.program.title}</h2>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-primary rounded-full" style={{ width: `${item.progressPercent}%` }} />
              </div>
              <a href={`#/student/courses/${encodeURIComponent(item.program.slug)}`} className="block w-full text-center py-2.5 rounded-xl border border-primary text-primary font-medium text-sm hover:bg-primary/5">
                Lanjutkan Belajar
              </a>
            </div>
          </div>
        ))}
      </div>
      {data.length === 0 && <p className="text-gray-500 py-8">Belum ada kursus yang sesuai filter.</p>}
      {totalPagesResolved > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Menampilkan {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, totalResolved)} dari {totalResolved} kursus
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

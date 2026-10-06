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

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 h-64 animate-pulse space-y-3" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-5 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 text-sm font-medium max-w-7xl mx-auto">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Kursus Saya</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Lanjutkan belajar materi olimpiade dan pantau pencapaian belajarmu.
          </p>
        </div>
        <a
          href="#/catalog"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Eksplor Katalog</span>
        </a>
      </div>

      {/* Filter & Search Bar (TeachSync Style) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 flex flex-col md:flex-row gap-3 shadow-xs">
        <div className="relative flex-1">
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari materi atau nama program..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all"
          />
        </div>
        <select
          value={progressFilter}
          onChange={(e) => setProgressFilter(e.target.value as 'all' | 'in-progress' | 'completed')}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 md:w-56"
        >
          <option value="all">Semua Status Progres</option>
          <option value="in-progress">Sedang Dipelajari</option>
          <option value="completed">Sudah Selesai</option>
        </select>
      </div>

      {/* Grid Kartu Kursus */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {data.map((item) => {
          const isComplete = item.progressPercent >= 100
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="aspect-video bg-gradient-to-br from-teal-800 to-slate-900 flex items-center justify-center text-4xl font-extrabold text-white/30 relative overflow-hidden">
                  {item.program.thumbnail ? (
                    <img src={item.program.thumbnail} alt={item.program.title} className="w-full h-full object-cover" />
                  ) : (
                    <span>{item.program.title.charAt(0)}</span>
                  )}
                  <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs ${
                    isComplete
                      ? 'bg-emerald-500 text-white'
                      : 'bg-teal-600 text-white'
                  }`}>
                    {isComplete ? 'Selesai 🏅' : `${item.progressPercent}% Progres`}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <h2 className="font-bold text-slate-900 mb-3 line-clamp-2 text-sm sm:text-base leading-snug">
                    {item.program.title}
                  </h2>

                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
                      <span>Progres Materi</span>
                      <span className="font-bold text-teal-700">{item.progressPercent}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isComplete ? 'bg-emerald-500' : 'bg-teal-600'
                        }`}
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 pt-0">
                <a
                  href={`#/student/courses/${encodeURIComponent(item.program.slug)}`}
                  className="block w-full text-center py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors"
                >
                  {isComplete ? 'Buka Materi & Ulas' : 'Lanjutkan Belajar →'}
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {data.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4 text-2xl">
            📚
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Tidak ada kursus yang cocok</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-5">
            Coba sesuaikan kata kunci pencarian atau status filter untuk menemukan kursusmu.
          </p>
          <a
            href="#/catalog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs"
          >
            Lihat Katalog Program
          </a>
        </div>
      )}

      {/* Pagination */}
      {totalPagesResolved > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm pt-4 border-t border-slate-200">
          <p className="text-slate-500">
            Menampilkan <span className="font-semibold text-slate-800">{(safePage - 1) * PAGE_SIZE + 1}</span> - <span className="font-semibold text-slate-800">{Math.min(safePage * PAGE_SIZE, totalResolved)}</span> dari <span className="font-semibold text-slate-800">{totalResolved}</span> kursus
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-xs"
            >
              ← Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPagesResolved, p + 1))}
              disabled={safePage >= totalPagesResolved}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-xs"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

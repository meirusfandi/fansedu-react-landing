import { useState, useEffect } from 'react'
import { LmsHeader } from '../../components/lms/Header'
import { CourseCard } from '../../components/lms/CourseCard'
import { getPrograms } from '../../lib/api'
import type { Course } from '../../types/course'

const CATEGORIES = ['Semua', 'Programming', 'OSN', 'Bundle']

export default function CatalogPage() {
  const [category, setCategory] = useState('Semua')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ data: Course[]; totalPages: number }>({ data: [], totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cat = category === 'Semua' ? undefined : category

  useEffect(() => {
    setLoading(true)
    setError(null)
    getPrograms({
      category: cat,
      search: search || undefined,
      page,
      limit: 12,
    })
      .then((res) => {
        setData({
          data: res.data as unknown as Course[],
          totalPages: res.totalPages || 1,
        })
      })
      .catch((err) => {
        setError(err?.message || 'Gagal memuat katalog.')
        setData({ data: [], totalPages: 1 })
      })
      .finally(() => setLoading(false))
  }, [cat, search, page])

  const { data: courses, totalPages } = data

  return (
    <div className="min-h-screen flex flex-col">
      <LmsHeader />
      <main className="flex-1 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Katalog Program</h1>
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <input
              type="search"
              placeholder="Cari program..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary"
            />
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${category === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">
              {error}
            </div>
          )}
          {loading ? (
            <div className="py-12 text-center text-gray-500">Memuat...</div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
              {courses.length === 0 && !error && (
                <p className="text-center text-gray-500 py-8">Belum ada program.</p>
              )}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border text-sm disabled:opacity-50">Sebelumnya</button>
                  <span className="px-4 py-2 text-sm text-gray-600">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-lg border text-sm disabled:opacity-50">Selanjutnya</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

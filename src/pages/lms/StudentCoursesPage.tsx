import { useState, useEffect } from 'react'
import { getMyCourses } from '../../lib/api'
import { ApiError } from '../../lib/api'

export default function StudentCoursesPage() {
  const [data, setData] = useState<{ id: string; program: { slug: string; title: string; thumbnail?: string }; progressPercent: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMyCourses()
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Courses</h1>
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
              <a href={`#/program/${item.program.slug}`} className="block w-full text-center py-2.5 rounded-xl border border-primary text-primary font-medium text-sm hover:bg-primary/5">
                Lanjutkan Belajar
              </a>
            </div>
          </div>
        ))}
      </div>
      {data.length === 0 && <p className="text-gray-500 py-8">Belum ada kursus. Daftar program dari katalog.</p>}
    </div>
  )
}

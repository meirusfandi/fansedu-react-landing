import { useState, useEffect } from 'react'
import { getInstructorCourses } from '../../lib/api'
import { ApiError } from '../../lib/api'

export default function GuruCoursesPage() {
  const [data, setData] = useState<{ id: string; title: string; slug: string; category?: string; studentCount?: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getInstructorCourses()
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Kursus Saya</h1>
      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Kursus</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Kategori</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Siswa</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-4 px-4 font-medium">{c.title}</td>
                <td className="py-4 px-4 text-gray-600">{c.category ?? '-'}</td>
                <td className="py-4 px-4">{c.studentCount ?? 0} peserta</td>
                <td className="py-4 px-4">
                  <a href={`#/program/${c.slug}`} className="text-primary font-medium hover:underline">Kelola</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && <p className="text-gray-500 py-8">Belum ada kursus.</p>}
    </div>
  )
}

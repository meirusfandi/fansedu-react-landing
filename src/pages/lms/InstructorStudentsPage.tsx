import { useState, useEffect } from 'react'
import { getInstructorStudents } from '../../lib/api'
import { ApiError } from '../../lib/api'

export default function InstructorStudentsPage() {
  const [data, setData] = useState<{ userId: string; name: string; email: string; programTitle: string; progressPercent: number }[]>([])
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [progressFilter, setProgressFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getInstructorStudents()
      .then((res) => setData(res.data || []))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat data.')
        setData([])
      })
      .finally(() => setLoading(false))
  }, [])

  const courseOptions = Array.from(new Set(data.map((row) => row.programTitle).filter(Boolean)))
  const filtered = data.filter((row) => {
    const keyword = search.trim().toLowerCase()
    const matchesSearch =
      !keyword ||
      row.name.toLowerCase().includes(keyword) ||
      row.email.toLowerCase().includes(keyword) ||
      row.programTitle.toLowerCase().includes(keyword)
    const matchesCourse = courseFilter === 'all' || row.programTitle === courseFilter
    const progress = row.progressPercent || 0
    const matchesProgress =
      progressFilter === 'all' ||
      (progressFilter === 'active' && progress > 0 && progress < 100) ||
      (progressFilter === 'completed' && progress >= 100)
    return matchesSearch && matchesCourse && matchesProgress
  })

  if (loading) return <div className="py-8 text-gray-500">Memuat...</div>
  if (error) return <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Siswa</h1>
      <div className="rounded-2xl border bg-white p-4 mb-4 grid md:grid-cols-3 gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama/email..."
          className="rounded-lg border px-4 py-2.5 text-sm"
        />
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
        <select
          value={progressFilter}
          onChange={(e) => setProgressFilter(e.target.value as 'all' | 'active' | 'completed')}
          className="rounded-lg border px-4 py-2.5 text-sm"
        >
          <option value="all">Semua progress</option>
          <option value="active">Sedang belajar</option>
          <option value="completed">Selesai</option>
        </select>
      </div>
      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Nama</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Email</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Kursus</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Progress</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.userId} className="border-b last:border-0">
                <td className="py-4 px-4 font-medium">{r.name}</td>
                <td className="py-4 px-4 text-gray-600">{r.email}</td>
                <td className="py-4 px-4">{r.programTitle}</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${r.progressPercent}%` }} />
                    </div>
                    <span className="text-gray-600">{r.progressPercent}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="text-gray-500 py-8">Belum ada siswa yang sesuai filter.</p>}
    </div>
  )
}

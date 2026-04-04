import { useState, useEffect } from 'react'
import {
  ApiError,
  getInstructorCourses,
  listAdminCourses,
  type AdminCourseListItem,
  type InstructorCourseItem,
} from '../../lib/api'

type Row =
  | (AdminCourseListItem & { source: 'admin' })
  | (InstructorCourseItem & { source: 'guru' })

export default function GuruCoursesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [listNote, setListNote] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setListNote(null)

    listAdminCourses()
      .then((admin) => {
        if (admin.length > 0) {
          setRows(admin.map((c) => ({ ...c, source: 'admin' as const })))
          setListNote('Daftar dari GET /admin/courses (trackType & kelola program).')
          return
        }
        return getInstructorCourses().then((res) => {
          setRows((res.data || []).map((c) => ({ ...c, source: 'guru' as const })))
          setListNote('Daftar dari GET /guru/courses — tanpa trackType. Gunakan UUID kursus untuk Program jika backend sama.')
        })
      })
      .catch(() =>
        getInstructorCourses()
          .then((res) => {
            setRows((res.data || []).map((c) => ({ ...c, source: 'guru' as const })))
            setListNote('Admin list tidak tersedia (403?). Menampilkan kursus instruktur.')
          })
          .catch((err) => {
            setError(err instanceof ApiError ? err.message : 'Gagal memuat data.')
            setRows([])
          }),
      )
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-8 text-gray-500">Memuat...</div>
  if (error) return <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Kursus Saya</h1>
      {listNote ? <p className="text-xs text-gray-500 mb-6">{listNote}</p> : null}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Kursus</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Track</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Kategori / slug</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Siswa</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-4 px-4 font-medium">{c.title}</td>
                <td className="py-4 px-4 text-gray-600">
                  {c.source === 'admin' && c.trackType ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">{c.trackType}</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-4 px-4 text-gray-600 text-xs font-mono">
                  {c.source === 'admin' ? c.slug ?? '—' : c.category ?? c.slug ?? '—'}
                </td>
                <td className="py-4 px-4">{c.source === 'guru' ? `${c.studentCount ?? 0} peserta` : '—'}</td>
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-1">
                    <a
                      href={`#/guru/courses/${encodeURIComponent(c.id)}/program`}
                      className="text-primary font-medium hover:underline"
                    >
                      Program & pertemuan
                    </a>
                    <a
                      href={`#/guru/courses/${encodeURIComponent(c.id)}/learn`}
                      className="text-gray-600 hover:text-primary text-xs"
                    >
                      Pratinjau journey
                    </a>
                    {c.slug ? (
                      <a
                        href={`#/program/${encodeURIComponent(c.slug)}`}
                        className="text-gray-500 hover:underline text-xs"
                      >
                        Halaman publik
                      </a>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="text-gray-500 py-8">Belum ada kursus.</p>}
    </div>
  )
}

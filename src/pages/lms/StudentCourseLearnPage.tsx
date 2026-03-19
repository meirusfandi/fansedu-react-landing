import { useEffect, useMemo, useState } from 'react'
import { ApiError, getMyCourses } from '../../lib/api'
import { getCourseBySlug } from '../../lib/mock-courses'
import type { CourseModule } from '../../types/course'

export default function StudentCourseLearnPage({ courseSlug }: { courseSlug: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [courseTitle, setCourseTitle] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [modules, setModules] = useState<CourseModule[]>([])

  useEffect(() => {
    setLoading(true)
    setError(null)
    getMyCourses({ search: courseSlug, page: 1, limit: 200 })
      .then((res) => {
        const item = (res.data || []).find((row) => row.program.slug === courseSlug)
        if (!item) {
          setError('Kursus tidak ditemukan di akun Anda.')
          setCourseTitle('')
          setModules([])
          return
        }
        setCourseTitle(item.program.title)
        setProgressPercent(item.progressPercent || 0)
        const detail = getCourseBySlug(item.program.slug)
        setModules(detail?.modules ?? [])
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat kursus.')
      })
      .finally(() => setLoading(false))
  }, [courseSlug])

  const totalLessons = useMemo(
    () => modules.reduce((sum, moduleItem) => sum + moduleItem.lessons.length, 0),
    [modules]
  )

  if (loading) return <div className="py-8 text-gray-500">Memuat kelas...</div>
  if (error) {
    return (
      <div className="space-y-4">
        <a href="#/student/courses" className="text-primary text-sm font-medium hover:underline">← My Courses</a>
        <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <a href="#/student/courses" className="text-sm text-primary hover:underline">
          ← Kembali ke My Courses
        </a>
      </div>
      <div className="rounded-2xl border bg-white p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{courseTitle}</h1>
        <p className="text-sm text-gray-600 mb-3">
          Halaman belajar internal siswa. Di sini peserta fokus melanjutkan materi tanpa kembali ke halaman katalog publik.
        </p>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-primary rounded-full" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="text-sm text-gray-500">Progress kursus: <span className="font-semibold text-gray-900">{progressPercent}%</span></p>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Daftar Materi ({totalLessons} lesson)</h2>
        {modules.length === 0 ? (
          <p className="text-sm text-gray-500">
            Materi detail belum tersedia pada endpoint saat ini. Silakan lanjutkan dari jadwal kelas/rekaman yang diberikan mentor.
          </p>
        ) : (
          <div className="space-y-4">
            {modules.map((moduleItem) => (
              <div key={moduleItem.id} className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-medium text-gray-900 mb-2">{moduleItem.title}</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  {moduleItem.lessons.map((lesson) => (
                    <li key={lesson.id} className="flex items-center justify-between gap-3">
                      <span>{lesson.title}</span>
                      <span className="text-xs text-gray-500">{lesson.duration}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

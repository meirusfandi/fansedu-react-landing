import { useEffect, useMemo, useState } from 'react'
import { ApiError, getInstructorCourses, getInstructorStudents } from '../../lib/api'

export default function InstructorDashboardPage() {
  const [coursesCount, setCoursesCount] = useState<number>(0)
  const [studentsCount, setStudentsCount] = useState<number>(0)
  const [averageProgress, setAverageProgress] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([getInstructorCourses(), getInstructorStudents()])
      .then(([coursesRes, studentsRes]) => {
        const courses = coursesRes.status === 'fulfilled' ? coursesRes.value.data ?? [] : []
        const students = studentsRes.status === 'fulfilled' ? studentsRes.value.data ?? [] : []

        setCoursesCount(courses.length)
        setStudentsCount(students.length)

        if (students.length > 0) {
          const totalProgress = students.reduce((sum, s) => sum + (s.progressPercent || 0), 0)
          setAverageProgress(Math.round(totalProgress / students.length))
        } else {
          setAverageProgress(0)
        }

        if (coursesRes.status === 'rejected' && studentsRes.status === 'rejected') {
          const err = studentsRes.reason ?? coursesRes.reason
          setError(err instanceof ApiError ? err.message : 'Gagal memuat data dashboard.')
        } else {
          setError(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const earningsLabel = useMemo(() => {
    return loading ? 'Memuat...' : 'Lihat detail di menu Pendapatan'
  }, [loading])

  if (error) return <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Guru</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Kursus Aktif</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? '-' : coursesCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Total Siswa</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? '-' : studentsCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Pendapatan Bulan Ini</p>
          <p className="text-sm font-medium text-primary">{earningsLabel}</p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Rata-rata Progress Siswa</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? '-' : `${averageProgress}%`}</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <a href="#/instructor/courses" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Kursus Saya</h2>
          <p className="text-sm text-gray-500">Kelola materi dan modul kursus</p>
        </a>
        <a href="#/instructor/students" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Siswa</h2>
          <p className="text-sm text-gray-500">Lihat daftar siswa dan progress</p>
        </a>
        <a href="#/instructor/tryouts" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Analisis Tryout</h2>
          <p className="text-sm text-gray-500">Analisis per soal, daftar peserta, dan analisis AI per siswa</p>
        </a>
      </div>
    </div>
  )
}

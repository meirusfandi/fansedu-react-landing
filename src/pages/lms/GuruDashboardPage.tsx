import { useEffect, useState } from 'react'
import { ApiError, getInstructorCourses, getInstructorStudents } from '../../lib/api'

export default function GuruDashboardPage() {
  const [coursesCount, setCoursesCount] = useState<number>(0)
  const [studentsCount, setStudentsCount] = useState<number>(0)
  const [studentsActive, setStudentsActive] = useState<number>(0)
  const [completionRate, setCompletionRate] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([getInstructorCourses(), getInstructorStudents()])
      .then(([coursesRes, studentsRes]) => {
        const courses = coursesRes.status === 'fulfilled' ? coursesRes.value.data ?? [] : []
        const students = studentsRes.status === 'fulfilled' ? studentsRes.value.data ?? [] : []

        setCoursesCount(courses.length)
        setStudentsCount(students.length)
        setStudentsActive(students.filter((s) => (s.progressPercent || 0) > 0).length)

        if (students.length > 0) {
          const totalProgress = students.reduce((sum, s) => sum + (s.progressPercent || 0), 0)
          const avgProgress = Math.round(totalProgress / students.length)
          setCompletionRate(Math.min(100, Math.max(0, avgProgress)))
        } else {
          setCompletionRate(0)
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

  if (error) return <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Guru</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Kursus Aktif</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? '-' : coursesCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Total Siswa Aktif</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? '-' : studentsActive}</p>
          <p className="text-xs text-gray-500 mt-1">dari {studentsCount} siswa terdaftar</p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Completion Rate</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? '-' : `${completionRate}%`}</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <a href="#/guru/courses" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Kursus Saya</h2>
          <p className="text-sm text-gray-500">Kelola materi dan modul kursus</p>
        </a>
        <a href="#/guru/students" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Siswa</h2>
          <p className="text-sm text-gray-500">Lihat daftar siswa dan progress</p>
        </a>
        <a href="#/guru/transactions" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Transaksi</h2>
          <p className="text-sm text-gray-500">Pantau pembelian kelas untuk siswa dan status pembayaran</p>
        </a>
        <a href="#/guru/profile" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Profile</h2>
          <p className="text-sm text-gray-500">Kelola data profil akun guru</p>
        </a>
      </div>
    </div>
  )
}

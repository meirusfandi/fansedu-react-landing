import { useEffect, useMemo, useState } from 'react'
import { ApiError, getMyCourses, getStudentDashboard, type MyCourseItem } from '../../lib/api'

export default function StudentDashboardPage() {
  const [courses, setCourses] = useState<MyCourseItem[]>([])
  const [coursesCount, setCoursesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([getStudentDashboard(), getMyCourses()])
      .then(([dashboardRes, myCoursesRes]) => {
        const dashboard =
          dashboardRes.status === 'fulfilled' ? dashboardRes.value : null
        const myCourses =
          myCoursesRes.status === 'fulfilled' ? myCoursesRes.value.data ?? [] : []

        const fallbackRecent = Array.isArray(dashboard?.recentCourses)
          ? dashboard.recentCourses
          : []
        const mergedCourses = myCourses.length > 0 ? myCourses : fallbackRecent

        setCourses(mergedCourses)
        setCoursesCount(
          typeof dashboard?.coursesCount === 'number'
            ? dashboard.coursesCount
            : mergedCourses.length
        )

        if (dashboardRes.status === 'rejected' && myCoursesRes.status === 'rejected') {
          const err = myCoursesRes.reason ?? dashboardRes.reason
          setError(err instanceof ApiError ? err.message : 'Gagal memuat progress kursus.')
        } else {
          setError(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const progressSummary = useMemo(() => {
    if (courses.length === 0) {
      return {
        averageProgress: 0,
        inProgressCount: 0,
        completedCount: 0,
      }
    }

    const totalProgress = courses.reduce((sum, item) => sum + item.progressPercent, 0)
    const averageProgress = Math.round(totalProgress / courses.length)
    const completedCount = courses.filter((item) => item.progressPercent >= 100).length
    const inProgressCount = courses.filter(
      (item) => item.progressPercent > 0 && item.progressPercent < 100
    ).length

    return { averageProgress, inProgressCount, completedCount }
  }, [courses])

  const recentCourses = useMemo(() => {
    return [...courses]
      .sort((a, b) => {
        const aTime = new Date(a.lastAccessedAt ?? a.enrolledAt).getTime()
        const bTime = new Date(b.lastAccessedAt ?? b.enrolledAt).getTime()
        return bTime - aTime
      })
      .slice(0, 3)
  }, [courses])

  if (loading) return <div className="py-8 text-gray-500">Memuat progress kursus...</div>
  if (error) return <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Siswa</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Total Kursus</p>
          <p className="text-2xl font-bold text-gray-900">{coursesCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Rata-rata Progress</p>
          <p className="text-2xl font-bold text-primary">{progressSummary.averageProgress}%</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Sedang Dipelajari</p>
          <p className="text-2xl font-bold text-gray-900">{progressSummary.inProgressCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Selesai</p>
          <p className="text-2xl font-bold text-gray-900">{progressSummary.completedCount}</p>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Progress Kursus Terbaru</h2>
        {recentCourses.length === 0 ? (
          <p className="text-sm text-gray-500">
            Belum ada progress kursus. Silakan daftar program dari katalog.
          </p>
        ) : (
          <div className="space-y-4">
            {recentCourses.map((item) => (
              <a
                key={item.id}
                href={`#/program/${item.program.slug}`}
                className="block rounded-xl border border-slate-200 p-4 hover:border-primary/30 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="font-medium text-gray-900 line-clamp-1">{item.program.title}</h3>
                  <span className="text-sm font-semibold text-primary">
                    {item.progressPercent}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {coursesCount > 0 && (
        <p className="text-gray-600 mb-4">Anda terdaftar di {coursesCount} kursus.</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <a href="#/student/courses" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">My Courses</h2>
          <p className="text-sm text-gray-500">Lanjutkan belajar dan lihat progress</p>
        </a>
        <a href="#/student/tryout" className="block p-6 rounded-2xl bg-white border-2 border-primary/20 hover:border-primary/40 hover:shadow-md relative">
          <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Gratis</span>
          <h2 className="font-semibold text-gray-900 mb-1">TryOut OSN</h2>
          <p className="text-sm text-gray-500">Daftar tryout dan ikut ujian dari sini setelah Anda punya akun.</p>
        </a>
        <a href="#/student/transactions" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Transactions</h2>
          <p className="text-sm text-gray-500">Riwayat pembayaran</p>
        </a>
        <a href="#/student/certificates" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Certificates</h2>
          <p className="text-sm text-gray-500">Sertifikat kelulusan</p>
        </a>
      </div>
    </div>
  )
}

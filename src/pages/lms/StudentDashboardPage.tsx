import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  getStudentNextActions,
  getMyCourses,
  getOpenTryouts,
  getStudentDashboard,
  getTransactions,
  type StudentNextActionItem,
  type MyCourseItem,
  type StudentDashboardResponse,
} from '../../lib/api'
import { useNotificationsStore } from '../../store/notifications'
import { filterStudentVisibleTryouts } from '../../utils/tryoutStudent'

interface TryoutProgressSummary {
  attemptedCount: number
  completedCount: number
  registeredCount: number
  averageScore: number
  bestScore: number
  upcomingCount: number
  completionRate: number
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function extractTryoutProgressSummary(
  dashboard: StudentDashboardResponse | null,
  fallbackUpcoming: number
): TryoutProgressSummary {
  const source = asRecord(
    dashboard?.tryoutSummary ??
      dashboard?.tryout_progress ??
      dashboard?.tryoutProgress ??
      dashboard?.tryouts ??
      dashboard?.tryout
  ) ?? {}

  const attemptedCount = Math.max(
    0,
    Math.trunc(
      toNumber(
        source.attemptedCount ??
          source.attempted_count ??
          source.totalAttempts ??
          source.total_attempts ??
          source.attemptCount ??
          source.attempt_count
      )
    )
  )
  const completedCount = Math.max(
    0,
    Math.trunc(
      toNumber(
        source.completedCount ??
          source.completed_count ??
          source.finishedCount ??
          source.finished_count
      )
    )
  )
  const registeredCount = Math.max(
    completedCount,
    Math.trunc(
      toNumber(
        source.registeredCount ??
          source.registered_count ??
          source.joinedCount ??
          source.joined_count ??
          completedCount
      )
    )
  )
  const averageScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        toNumber(
          source.averageScore ??
            source.average_score ??
            source.avgScore ??
            source.avg_score
        )
      )
    )
  )
  const bestScore = Math.max(
    averageScore,
    Math.min(
      100,
      Math.round(
        toNumber(
          source.bestScore ??
            source.best_score ??
            source.highestScore ??
            source.highest_score ??
            averageScore
        )
      )
    )
  )
  const upcomingCount = Math.max(
    0,
    Math.trunc(
      toNumber(
        source.upcomingCount ??
          source.upcoming_count ??
          source.availableCount ??
          source.available_count ??
          fallbackUpcoming
      )
    )
  )
  const completionRate =
    attemptedCount > 0
      ? Math.round((Math.min(completedCount, attemptedCount) / attemptedCount) * 100)
      : 0

  return {
    attemptedCount,
    completedCount,
    registeredCount,
    averageScore,
    bestScore,
    upcomingCount,
    completionRate,
  }
}

export default function StudentDashboardPage() {
  const upsertNotifications = useNotificationsStore((s) => s.upsertItems)
  const [courses, setCourses] = useState<MyCourseItem[]>([])
  const [coursesCount, setCoursesCount] = useState(0)
  const [nextActions, setNextActions] = useState<StudentNextActionItem[]>([])
  const [pendingTransactions, setPendingTransactions] = useState(0)
  const [tryoutProgress, setTryoutProgress] = useState<TryoutProgressSummary>({
    attemptedCount: 0,
    completedCount: 0,
    registeredCount: 0,
    averageScore: 0,
    bestScore: 0,
    upcomingCount: 0,
    completionRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([
      getStudentDashboard(),
      getMyCourses({ page: 1, limit: 200 }),
      getOpenTryouts(),
      getTransactions({ status: 'pending', page: 1, limit: 50 }),
      getStudentNextActions(),
    ])
      .then(([dashboardRes, myCoursesRes, openTryoutsRes, transactionsRes, nextActionsRes]) => {
        const dashboard =
          dashboardRes.status === 'fulfilled' ? dashboardRes.value : null
        const myCourses =
          myCoursesRes.status === 'fulfilled' ? myCoursesRes.value.data ?? [] : []
        const openTryouts =
          openTryoutsRes.status === 'fulfilled'
            ? filterStudentVisibleTryouts(openTryoutsRes.value ?? [])
            : []
        const pendingTx =
          transactionsRes.status === 'fulfilled'
            ? (transactionsRes.value.data ?? []).filter((tx) => tx.status.toLowerCase() === 'pending').length
            : 0
        const actionRows =
          nextActionsRes.status === 'fulfilled' ? nextActionsRes.value.data ?? [] : []

        const fallbackRecent = Array.isArray(dashboard?.recentCourses)
          ? dashboard.recentCourses
          : []
        const mergedCourses = myCourses.length > 0 ? myCourses : fallbackRecent
        const completedCoursesLocal = mergedCourses.filter((item) => item.progressPercent >= 100).length
        const inProgressCoursesLocal = mergedCourses.filter(
          (item) => item.progressPercent > 0 && item.progressPercent < 100
        ).length

        setCourses(mergedCourses)
        setCoursesCount(
          typeof dashboard?.coursesCount === 'number'
            ? dashboard.coursesCount
            : mergedCourses.length
        )
        setTryoutProgress(extractTryoutProgressSummary(dashboard, openTryouts.length))
        setPendingTransactions(pendingTx)
        setNextActions(actionRows.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999)))

        const systemNotifications = [
          pendingTx > 0
            ? {
              id: 'notif-pending-payment',
              title: 'Pembayaran Menunggu Konfirmasi',
              message: `Ada ${pendingTx} transaksi pending. Segera upload bukti pembayaran.`,
              href: '#/student/transactions',
              level: 'warning' as const,
              createdAt: new Date().toISOString(),
            }
            : null,
          openTryouts.length > 0
            ? {
              id: 'notif-open-tryouts',
              title: 'Tryout Baru Tersedia',
              message: `${openTryouts.length} tryout terbuka siap kamu ikuti.`,
              href: '#/student/tryout',
              level: 'info' as const,
              createdAt: new Date().toISOString(),
            }
            : null,
          inProgressCoursesLocal > 0
            ? {
              id: 'notif-course-progress',
              title: 'Lanjutkan Progress Kursus',
              message: `Kamu punya ${inProgressCoursesLocal} kursus yang sedang berjalan.`,
              href: '#/student/courses',
              level: 'info' as const,
              createdAt: new Date().toISOString(),
            }
            : null,
        ].filter(Boolean) as Array<{
          id: string
          title: string
          message: string
          href: string
          level: 'info' | 'warning'
          read: boolean
          createdAt: string
        }>
        upsertNotifications(systemNotifications)

        if (
          dashboardRes.status === 'rejected' &&
          myCoursesRes.status === 'rejected' &&
          openTryoutsRes.status === 'rejected' &&
          transactionsRes.status === 'rejected'
        ) {
          const err = myCoursesRes.reason ?? dashboardRes.reason ?? openTryoutsRes.reason ?? transactionsRes.reason
          setError(err instanceof ApiError ? err.message : 'Gagal memuat data dashboard siswa.')
        } else {
          setError(null)
        }
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 11) return 'Selamat pagi'
    if (hour < 15) return 'Selamat siang'
    if (hour < 19) return 'Selamat sore'
    return 'Selamat malam'
  }, [])

  const derivedActions = useMemo(() => {
    if (nextActions.length > 0) return nextActions.slice(0, 3)
    const out: StudentNextActionItem[] = []
    if (coursesCount === 0) {
      out.push({
        id: 'fallback-action-register-course',
        type: 'custom',
        title: 'Daftar kursus pertama',
        description: 'Mulai perjalanan belajarmu dari katalog program.',
        href: '#/catalog',
        priority: 1,
      })
    } else if (recentCourses[0]) {
      out.push({
        id: 'fallback-action-continue-course',
        type: 'continue_course',
        title: `Lanjutkan ${recentCourses[0].program.title}`,
        description: 'Teruskan progress kursus terakhir yang kamu akses.',
        href: `#/student/courses/${encodeURIComponent(recentCourses[0].program.slug)}`,
        priority: 1,
      })
    }
    if (tryoutProgress.upcomingCount > 0) {
      out.push({
        id: 'fallback-action-start-tryout',
        type: 'start_tryout',
        title: 'Ikuti tryout terdekat',
        description: `${tryoutProgress.upcomingCount} tryout sedang terbuka.`,
        href: '#/student/tryout',
        priority: 2,
      })
    }
    if (pendingTransactions > 0) {
      out.push({
        id: 'fallback-action-pending-payment',
        type: 'payment_pending',
        title: 'Selesaikan transaksi pending',
        description: `Ada ${pendingTransactions} pembayaran menunggu konfirmasi.`,
        href: '#/student/transactions',
        priority: 3,
      })
    }
    return out
  }, [nextActions, coursesCount, recentCourses, tryoutProgress.upcomingCount, pendingTransactions])

  const achievementSummary = useMemo(() => {
    if (coursesCount === 0 && tryoutProgress.attemptedCount === 0) {
      return 'Mulai dari ikut tryout gratis dan daftar kursus pertama agar progress belajarmu mulai terbentuk.'
    }
    if (tryoutProgress.bestScore >= 80 || progressSummary.completedCount >= 2) {
      return 'Performa belajar kamu sudah sangat baik. Pertahankan ritme belajar dan tingkatkan konsistensi di tryout berikutnya.'
    }
    if (progressSummary.averageProgress >= 50 || tryoutProgress.averageScore >= 60) {
      return 'Kamu sudah berada di jalur yang tepat. Fokuskan latihan pada materi yang progress-nya masih rendah agar pencapaian makin cepat.'
    }
    return 'Progress awal sudah berjalan. Tingkatkan frekuensi latihan dan selesaikan modul dasar untuk mempercepat pencapaian.'
  }, [
    coursesCount,
    progressSummary.averageProgress,
    progressSummary.completedCount,
    tryoutProgress.attemptedCount,
    tryoutProgress.averageScore,
    tryoutProgress.bestScore,
  ])

  if (loading) return <div className="py-8 text-gray-500">Memuat progress kursus...</div>
  if (error) return <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard Siswa</h1>
      <p className="text-gray-500 mb-6">{greeting}! Ringkasan progresmu hari ini.</p>

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
          <p className="text-sm text-gray-500">Rata-rata Tryout</p>
          <p className="text-2xl font-bold text-primary">{tryoutProgress.averageScore}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Transaksi Pending</p>
          <p className="text-2xl font-bold text-gray-900">{pendingTransactions}</p>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-3">Aksi Berikutnya</h2>
        {derivedActions.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada aksi prioritas saat ini.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {derivedActions.map((action) => (
              <a key={action.id} href={action.href} className="rounded-xl border border-slate-200 p-4 hover:border-primary/30 hover:bg-slate-50">
                <p className="font-medium text-gray-900 mb-1">{action.title}</p>
                {action.description && <p className="text-xs text-gray-600">{action.description}</p>}
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-3">Ringkasan Pencapaian</h2>
        <p className="text-sm text-gray-600 mb-4">{achievementSummary}</p>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-gray-500">Kursus selesai</p>
            <p className="font-semibold text-gray-900">{progressSummary.completedCount} kursus</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-gray-500">Sedang dipelajari</p>
            <p className="font-semibold text-gray-900">{progressSummary.inProgressCount} kursus</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-gray-500">Tryout selesai</p>
            <p className="font-semibold text-gray-900">{tryoutProgress.completedCount} sesi</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-gray-500">Skor tryout terbaik</p>
            <p className="font-semibold text-gray-900">{tryoutProgress.bestScore}</p>
          </div>
        </div>
      </section>

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
                href={`#/student/courses/${encodeURIComponent(item.program.slug)}`}
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
        <p className="text-gray-600 mb-4">Anda terdaftar di {coursesCount} kursus. Keep going!</p>
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

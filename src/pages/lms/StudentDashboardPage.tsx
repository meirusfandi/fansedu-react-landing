import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  getStudentNextActions,
  getMyCourses,
  getStudentTryoutsOpen,
  getStudentDashboard,
  getTransactions,
  type StudentNextActionItem,
  type MyCourseItem,
  type StudentDashboardResponse,
} from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { useNotificationsStore } from '../../store/notifications'
import { filterStudentVisibleTryouts } from '../../utils/tryoutStudent'
import { isPendingTransactionStatus } from '../../utils/transactionStatus'

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
  const source = asRecord(dashboard?.tryoutSummary) ?? {}

  const attemptedCount = Math.max(0, Math.trunc(toNumber(source.attemptedCount)))
  const completedCount = Math.max(0, Math.trunc(toNumber(source.completedCount)))
  const registeredCount = Math.max(
    completedCount,
    Math.trunc(toNumber(source.registeredCount ?? completedCount)),
  )
  const averageScore = Math.max(
    0,
    Math.min(100, Math.round(toNumber(source.averageScore))),
  )
  const bestScore = Math.max(
    averageScore,
    Math.min(
      100,
      Math.round(toNumber(source.bestScore ?? averageScore)),
    ),
  )
  const upcomingCount = Math.max(
    0,
    Math.trunc(toNumber(source.upcomingCount ?? fallbackUpcoming)),
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

const DASHBOARD_SHOW_UI_AFTER_MS = 10_000

function StudentDashboardSkeleton() {
  const bar = 'h-4 rounded-lg bg-slate-200 animate-pulse'
  return (
    <div aria-busy className="space-y-6">
      {/* Hero Skeleton */}
      <div className="rounded-3xl bg-slate-200/80 p-6 sm:p-8 h-44 animate-pulse" />

      {/* KPI Cards Skeleton */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className={`${bar} w-24`} />
            <div className={`${bar} w-16 h-8`} />
          </div>
        ))}
      </div>

      {/* Main Section Skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className={`${bar} w-44`} />
        <div className="grid md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-100 p-4 h-24 bg-slate-50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user)
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
  const [staleLoad, setStaleLoad] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let slowTimer: ReturnType<typeof window.setTimeout> | null = null

    setLoading(true)
    setStaleLoad(false)
    setError(null)

    slowTimer = window.setTimeout(() => {
      if (cancelled) return
      setLoading(false)
      setStaleLoad(true)
    }, DASHBOARD_SHOW_UI_AFTER_MS)

    const pending = Promise.allSettled([
      getStudentDashboard(),
      getMyCourses({ page: 1, limit: 200 }),
      getStudentTryoutsOpen(),
      getTransactions({ status: 'pending', page: 1, limit: 50 }),
      getStudentNextActions(),
    ])

    pending
      .then(([dashboardRes, myCoursesRes, openTryoutsRes, transactionsRes, nextActionsRes]) => {
        if (cancelled) return
        const dashboard = dashboardRes.status === 'fulfilled' ? dashboardRes.value : null
        const myCourses = myCoursesRes.status === 'fulfilled' ? myCoursesRes.value.data ?? [] : []
        const openTryouts =
          openTryoutsRes.status === 'fulfilled'
            ? filterStudentVisibleTryouts(openTryoutsRes.value ?? [])
            : []
        const pendingTx =
          transactionsRes.status === 'fulfilled'
            ? (transactionsRes.value.data ?? []).filter((tx) => isPendingTransactionStatus(tx.status)).length
            : 0
        const actionRows =
          nextActionsRes.status === 'fulfilled' ? nextActionsRes.value.data ?? [] : []

        const fallbackRecent = Array.isArray(dashboard?.recentCourses) ? dashboard.recentCourses : []
        const mergedCourses = myCourses.length > 0 ? myCourses : fallbackRecent
        const inProgressCoursesLocal = mergedCourses.filter(
          (item) => item.progressPercent > 0 && item.progressPercent < 100
        ).length

        setCourses(mergedCourses)
        setCoursesCount(
          typeof dashboard?.coursesCount === 'number' ? dashboard.coursesCount : mergedCourses.length
        )
        setTryoutProgress(extractTryoutProgressSummary(dashboard, openTryouts.length))
        setPendingTransactions(pendingTx)
        setNextActions(actionRows.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999)))

        const systemNotifications = [
          pendingTx > 0
            ? {
                id: 'notif-pending-payment',
                title: 'Pembayaran Menunggu Konfirmasi',
                message: `Ada ${pendingTx} transaksi pending. Segera selesaikan pembayaran.`,
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
      .finally(() => {
        if (slowTimer !== null) window.clearTimeout(slowTimer)
        if (!cancelled) {
          setLoading(false)
          setStaleLoad(false)
        }
      })

    return () => {
      cancelled = true
      if (slowTimer !== null) window.clearTimeout(slowTimer)
    }
  }, [upsertNotifications])

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
    if (nextActions.length > 0) {
      return nextActions.filter((action) => action.href !== '#/student/practice').slice(0, 3)
    }
    const out: StudentNextActionItem[] = []
    if (coursesCount === 0) {
      out.push({
        id: 'fallback-action-register-course',
        type: 'custom',
        title: 'Daftar Kursus Pertama',
        description: 'Mulai perjalanan belajarmu dari katalog program Fansedu.',
        href: '#/catalog',
        priority: 1,
      })
    } else if (recentCourses[0]) {
      out.push({
        id: 'fallback-action-continue-course',
        type: 'continue_course',
        title: `Lanjutkan ${recentCourses[0].program.title}`,
        description: 'Teruskan materi pembelajaran terakhir yang kamu akses.',
        href: `#/student/courses/${encodeURIComponent(recentCourses[0].program.slug)}`,
        priority: 1,
      })
    }
    if (tryoutProgress.upcomingCount > 0) {
      out.push({
        id: 'fallback-action-start-tryout',
        type: 'start_tryout',
        title: 'Ikuti Tryout Terdekat',
        description: `${tryoutProgress.upcomingCount} tryout nasional sedang terbuka.`,
        href: '#/student/tryout',
        priority: 2,
      })
    }
    if (pendingTransactions > 0) {
      out.push({
        id: 'fallback-action-pending-payment',
        type: 'payment_pending',
        title: 'Selesaikan Transaksi Pending',
        description: `Ada ${pendingTransactions} pembayaran menunggu konfirmasi.`,
        href: '#/student/transactions',
        priority: 3,
      })
    }
    return out
  }, [nextActions, coursesCount, recentCourses, tryoutProgress.upcomingCount, pendingTransactions])

  const motivationalQuote = useMemo(() => {
    const quotes = [
      'Konsistensi mengalahkan bakat yang tidak berlatih keras.',
      'Satu soal yang kamu pecahkan hari ini adalah satu langkah menuju medali emas OSN.',
      'Setiap kesalahan saat tryout adalah petunjuk berharga untuk seleksi sesungguhnya.',
      'Logika dan algoritma terasah dari ribuan jam eksplorasi dan rasa ingin tahu.',
    ]
    return quotes[Math.floor(Math.random() * quotes.length)]
  }, [])

  if (loading && !staleLoad) return <StudentDashboardSkeleton />
  if (error) return <div className="p-5 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 text-sm font-medium">{error}</div>

  const primaryContinueCourse = recentCourses[0]

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* 1. Hero Welcome Banner (TeachSync Style) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white p-6 sm:p-8 lg:p-10 shadow-sm">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 right-32 w-48 h-48 rounded-full bg-emerald-400/15 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-xs text-teal-100 border border-white/20">
                {greeting}, {user?.name || 'Siswa Fansedu'}! 👋
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-200 border border-amber-300/30">
                Target: OSN 2026 🏅
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-2">
              Siap taklukkan tantangan hari ini?
            </h1>
            <p className="text-sm sm:text-base text-teal-100/90 leading-relaxed max-w-xl">
              {motivationalQuote}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {primaryContinueCourse ? (
              <a
                href={`#/student/courses/${encodeURIComponent(primaryContinueCourse.program.slug)}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-teal-900 font-bold text-sm shadow-md hover:bg-teal-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Lanjut Belajar</span>
                <svg className="w-4 h-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            ) : (
              <a
                href="#/catalog"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-teal-900 font-bold text-sm shadow-md hover:bg-teal-50 transition-all hover:scale-[1.02]"
              >
                <span>Jelajahi Program</span>
                <svg className="w-4 h-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            )}
            <a
              href="#/student/tryout"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-900/60 hover:bg-teal-900/80 text-white font-semibold text-sm border border-white/20 transition-all"
            >
              <span>Ujian Tryout</span>
            </a>
          </div>
        </div>
      </section>

      {staleLoad && (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs sm:text-sm text-amber-900 flex items-center gap-2"
          role="status"
        >
          <svg className="w-4 h-4 text-amber-600 shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Koneksi ke server sedikit lambat. Data sedang disinkronkan secara otomatis.</span>
        </div>
      )}

      {/* 2. KPI / Stat Metrics Cards (TeachSync Style) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Total Kursus */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-500">Kursus Aktif</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{coursesCount}</span>
            <span className="text-xs text-slate-500">Program</span>
          </div>
          <div className="mt-2 text-[11px] text-teal-700 font-medium">
            {progressSummary.completedCount} selesai · {progressSummary.inProgressCount} berjalan
          </div>
        </div>

        {/* Rata-rata Progres */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-500">Rata-rata Progres</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">{progressSummary.averageProgress}%</span>
            <span className="text-xs text-slate-500">Tuntas</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressSummary.averageProgress}%` }}
            />
          </div>
        </div>

        {/* Performa Tryout */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-500">Rerata Tryout</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{tryoutProgress.averageScore}</span>
            <span className="text-xs text-amber-600 font-semibold">Skor Terbaik: {tryoutProgress.bestScore}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {tryoutProgress.completedCount} tryout diselesaikan
          </div>
        </div>

        {/* Tryout Terbuka */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-500">Tryout Terbuka</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 tracking-tight">{tryoutProgress.upcomingCount}</span>
            <span className="text-xs text-slate-500">Siap Diikuti</span>
          </div>
          <div className="mt-2 text-[11px] text-indigo-700 font-medium">
            Format resmi simulasi olimpiade
          </div>
        </div>
      </section>

      {/* 3. Lanjutkan Belajar Cepat & Aksi Prioritas */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Lanjutkan Belajar Terakhir */}
        <section className="lg:col-span-2 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg" role="img" aria-label="Book">📖</span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Lanjutkan Belajar</h2>
              </div>
              <a href="#/student/courses" className="text-xs font-semibold text-teal-600 hover:text-teal-800">
                Semua Kursus ({coursesCount}) →
              </a>
            </div>

            {primaryContinueCourse ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/40 border border-slate-200/80">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase tracking-wider mb-1.5">
                      Sedang Aktif
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {primaryContinueCourse.program.title}
                    </h3>
                  </div>
                  <span className="text-base font-extrabold text-teal-700 shrink-0">
                    {primaryContinueCourse.progressPercent}%
                  </span>
                </div>

                <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-300"
                    style={{ width: `${primaryContinueCourse.progressPercent}%` }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    {primaryContinueCourse.lastAccessedAt ? 'Terakhir diakses baru-baru ini' : 'Mulai dari materi pertama'}
                  </span>
                  <a
                    href={`#/student/courses/${encodeURIComponent(primaryContinueCourse.program.slug)}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition-colors shadow-xs"
                  >
                    <span>Masuk Kelas &amp; Lanjutkan</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-2.5">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Belum Terdaftar di Kursus</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Pilih program pelatihan olimpiade sains terbaik di Fansedu untuk mulai bimbingan intensif.
                </p>
                <a
                  href="#/catalog"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 shadow-xs"
                >
                  Buka Katalog Program
                </a>
              </div>
            )}
          </div>

          {/* Daftar Kursus Berjalan Lainnya */}
          {recentCourses.length > 1 && (
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kursus Lainnya</p>
              {recentCourses.slice(1).map((c) => (
                <a
                  key={c.id}
                  href={`#/student/courses/${encodeURIComponent(c.program.slug)}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-800 line-clamp-1">{c.program.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-teal-700">{c.progressPercent}%</span>
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Kolom Kanan: Aksi Prioritas Hari Ini */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg" role="img" aria-label="Task">⚡</span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Aksi Prioritas</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Rekomendasi</span>
          </div>

          {derivedActions.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Semua target belajar saat ini sudah selesai!</p>
          ) : (
            <div className="space-y-3 flex-1">
              {derivedActions.map((action, idx) => (
                <a
                  key={action.id}
                  href={action.href}
                  className="group block p-3.5 rounded-2xl border border-slate-200/80 hover:border-teal-300 hover:bg-teal-50/20 transition-all shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 group-hover:bg-teal-100 group-hover:text-teal-800 transition-colors">
                      Langkah #{idx + 1}
                    </span>
                    <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-teal-900 transition-colors leading-snug">
                    {action.title}
                  </p>
                  {action.description && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {action.description}
                    </p>
                  )}
                </a>
              ))}
            </div>
          )}

          {/* Quick links ke fitur koding & tryout */}
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
            <a
              href="#/student/practice"
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200 text-center transition-colors"
            >
              <span className="block text-[11px] font-bold text-slate-800">Latihan Koding</span>
              <span className="text-[10px] text-slate-400">Problem Solving</span>
            </a>
            <a
              href="#/student/tryout"
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200 text-center transition-colors"
            >
              <span className="block text-[11px] font-bold text-slate-800">Simulasi Tryout</span>
              <span className="text-[10px] text-teal-600 font-semibold">Ranking Nasional</span>
            </a>
          </div>
        </section>
      </div>

      {/* 4. Gamifikasi / Pencapaian & Lencana Prestasi OSN */}
      <section className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label="Trophy">🏆</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Pencapaian &amp; Lencana Prestasi</h2>
              <p className="text-xs text-slate-500">Raih badge penghargaan seiring progres belajarmu di Fansedu!</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
            {achievementSummary}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
          {/* Badge 1: Peserta Aktif */}
          <div className={`p-4 rounded-2xl border text-center transition-all ${
            coursesCount > 0 ? 'bg-teal-50/60 border-teal-200 text-teal-900' : 'bg-slate-50/50 border-slate-200 opacity-60 text-slate-500'
          }`}>
            <span className="text-2xl sm:text-3xl block mb-1.5" role="img" aria-label="Enroll">🎓</span>
            <p className="text-xs font-bold leading-snug">Peserta Terdaftar</p>
            <p className="text-[10px] mt-0.5">{coursesCount > 0 ? `${coursesCount} Kursus` : 'Belum aktif'}</p>
          </div>

          {/* Badge 2: Konsistensi Belajar */}
          <div className={`p-4 rounded-2xl border text-center transition-all ${
            progressSummary.averageProgress >= 30 ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-slate-50/50 border-slate-200 opacity-60 text-slate-500'
          }`}>
            <span className="text-2xl sm:text-3xl block mb-1.5" role="img" aria-label="Fire">🔥</span>
            <p className="text-xs font-bold leading-snug">Fokus &amp; Konsisten</p>
            <p className="text-[10px] mt-0.5">{progressSummary.averageProgress >= 30 ? `${progressSummary.averageProgress}% Progres` : 'Target: 30%'}</p>
          </div>

          {/* Badge 3: Penakluk Tryout */}
          <div className={`p-4 rounded-2xl border text-center transition-all ${
            tryoutProgress.completedCount > 0 ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-slate-50/50 border-slate-200 opacity-60 text-slate-500'
          }`}>
            <span className="text-2xl sm:text-3xl block mb-1.5" role="img" aria-label="Target">🎯</span>
            <p className="text-xs font-bold leading-snug">Penakluk Tryout</p>
            <p className="text-[10px] mt-0.5">{tryoutProgress.completedCount > 0 ? `${tryoutProgress.completedCount} Selesai` : 'Belum ujian'}</p>
          </div>

          {/* Badge 4: Medali Emas / Top Score */}
          <div className={`p-4 rounded-2xl border text-center transition-all ${
            tryoutProgress.bestScore >= 80 ? 'bg-yellow-50/80 border-yellow-300 text-yellow-900 ring-1 ring-yellow-400' : 'bg-slate-50/50 border-slate-200 opacity-60 text-slate-500'
          }`}>
            <span className="text-2xl sm:text-3xl block mb-1.5" role="img" aria-label="Medal">🥇</span>
            <p className="text-xs font-bold leading-snug">Predikat Unggul</p>
            <p className="text-[10px] mt-0.5">{tryoutProgress.bestScore >= 80 ? `Skor ${tryoutProgress.bestScore}` : 'Target: Skor 80+'}</p>
          </div>
        </div>
      </section>

      {/* 5. Navigasi Cepat Portal Siswa */}
      <section className="grid sm:grid-cols-3 gap-4">
        <a
          href="#/student/courses"
          className="group block p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-teal-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors text-sm mb-1">
            Modul &amp; Materi Belajar
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Akses video penjelasan, rangkuman, dan rekaman kelas live.
          </p>
        </a>

        <a
          href="#/student/tryout"
          className="group block p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-teal-300 hover:shadow-md transition-all relative overflow-hidden"
        >
          <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
            Gratis
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors text-sm mb-1">
            Simulasi Tryout OSN
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Uji kemampuan di format standar kompetisi dan bandingkan peringkatmu secara nasional.
          </p>
        </a>

        <a
          href="#/student/transactions"
          className="group block p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-teal-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors text-sm mb-1">
            Riwayat Transaksi
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Cek invoice, status pembayaran, dan bukti registrasi kelas.
          </p>
        </a>
      </section>
    </div>
  )
}

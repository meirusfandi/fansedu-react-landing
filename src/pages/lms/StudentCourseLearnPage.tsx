import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  completeCourseLesson,
  getCourseJourney,
  getCourseLessonDetail,
  getMyCourses,
  type LearningJourneyCourseDetailPayload,
  type LearningJourneyLessonDetail,
} from '../../lib/api'
import { getCourseBySlug } from '../../lib/mock-courses'
import type { CourseModule } from '../../types/course'
import { LearningJourneyCourseView } from '../../components/lms/LearningJourneyCourseView'
import { useLearningJourneyStore } from '../../store/learningJourney'

function firstSelectableLessonId(detail: LearningJourneyCourseDetailPayload): string | null {
  for (const sec of detail.sections) {
    for (const l of sec.lessons) {
      if (!l.locked) return l.id
    }
  }
  return null
}

export default function StudentCourseLearnPage({
  courseSlug,
  initialLessonId,
}: {
  courseSlug: string
  initialLessonId?: string
}) {
  const setCourseDetail = useLearningJourneyStore((s) => s.setCourseDetail)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [courseTitle, setCourseTitle] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [modules, setModules] = useState<CourseModule[]>([])

  const [journeyDetail, setJourneyDetail] = useState<LearningJourneyCourseDetailPayload | null>(null)
  const [journeyMode, setJourneyMode] = useState(false)

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [lessonDetail, setLessonDetail] = useState<LearningJourneyLessonDetail | null>(null)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)

  const setHashLesson = useCallback(
    (slug: string, lessonId: string) => {
      window.location.hash = `/student/courses/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(lessonId)}`
    },
    []
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setJourneyDetail(null)
    setJourneyMode(false)
    setLessonDetail(null)
    setCompleteError(null)

    getMyCourses({ search: courseSlug, page: 1, limit: 200 })
      .then(async (res) => {
        if (cancelled) return
        const item = (res.data || []).find((row) => row.program.slug === courseSlug)
        if (!item) {
          setError('Kursus tidak ditemukan di akun Anda.')
          setCourseTitle('')
          setModules([])
          return
        }
        setCourseTitle(item.program.title)
        setProgressPercent(item.progressPercent || 0)

        let journey: LearningJourneyCourseDetailPayload | null = null
        try {
          journey = await getCourseJourney(courseSlug)
        } catch {
          journey = null
        }

        if (cancelled) return

        if (journey && journey.sections.length > 0) {
          setJourneyMode(true)
          setJourneyDetail(journey)
          setCourseDetail(courseSlug, journey)
          const pick =
            (initialLessonId && journey.sections.some((s) => s.lessons.some((l) => l.id === initialLessonId)))
              ? initialLessonId
              : firstSelectableLessonId(journey)
          setSelectedLessonId(pick)
          return
        }

        const detail = getCourseBySlug(item.program.slug)
        setModules(detail?.modules ?? [])
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Gagal memuat kursus.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [courseSlug, initialLessonId, setCourseDetail])

  useEffect(() => {
    if (!journeyMode || !selectedLessonId) {
      setLessonDetail(null)
      return
    }
    let cancelled = false
    setLessonLoading(true)
    getCourseLessonDetail(selectedLessonId)
      .then((d) => {
        if (!cancelled) setLessonDetail(d)
      })
      .catch(() => {
        if (!cancelled) setLessonDetail(null)
      })
      .finally(() => {
        if (!cancelled) setLessonLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [journeyMode, selectedLessonId])

  const onSelectLesson = useCallback(
    (lessonId: string) => {
      setCompleteError(null)
      setSelectedLessonId(lessonId)
      setHashLesson(courseSlug, lessonId)
    },
    [courseSlug, setHashLesson]
  )

  const onMarkComplete = useCallback(async () => {
    if (!selectedLessonId || !journeyDetail) return
    setCompleteLoading(true)
    setCompleteError(null)
    try {
      const res = await completeCourseLesson(selectedLessonId)
      const fresh = await getCourseJourney(courseSlug)
      if (fresh) {
        setJourneyDetail(fresh)
        setCourseDetail(courseSlug, fresh)
      }
      if (res.nextLessonId) {
        setSelectedLessonId(res.nextLessonId)
        setHashLesson(courseSlug, res.nextLessonId)
      } else {
        const updated = fresh ?? journeyDetail
        const next = firstSelectableLessonId(updated)
        if (next && next !== selectedLessonId) {
          setSelectedLessonId(next)
          setHashLesson(courseSlug, next)
        }
      }
    } catch (e) {
      setCompleteError(e instanceof ApiError ? e.message : 'Gagal menandai selesai.')
    } finally {
      setCompleteLoading(false)
    }
  }, [courseSlug, journeyDetail, selectedLessonId, setCourseDetail, setHashLesson])

  const totalLessons = useMemo(
    () => modules.reduce((sum, moduleItem) => sum + moduleItem.lessons.length, 0),
    [modules]
  )

  if (loading) return <div className="py-8 text-gray-500">Memuat kelas...</div>
  if (error) {
    return (
      <div className="space-y-4">
        <a href="#/student/courses" className="text-primary text-sm font-medium hover:underline">
          ← My Courses
        </a>
        <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>
      </div>
    )
  }

  if (journeyMode && journeyDetail) {
    return (
      <div>
        <div className="mb-6">
          <a href="#/student/courses" className="text-sm text-primary hover:underline">
            ← Kembali ke My Courses
          </a>
        </div>
        <div className="rounded-2xl border bg-white p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{journeyDetail.course.title || courseTitle}</h1>
          {journeyDetail.course.description ? (
            <p className="text-sm text-gray-600 mb-3">{journeyDetail.course.description}</p>
          ) : (
            <p className="text-sm text-gray-600 mb-3">
              Learning Journey — lanjutkan lesson secara berurutan; lesson berikutnya terbuka setelah yang sebelumnya
              selesai.
            </p>
          )}
        </div>
        <LearningJourneyCourseView
          detail={journeyDetail}
          lessonDetail={lessonDetail}
          lessonLoading={lessonLoading}
          selectedLessonId={selectedLessonId}
          onSelectLesson={onSelectLesson}
          onMarkComplete={onMarkComplete}
          completeLoading={completeLoading}
          completeError={completeError}
        />
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
        <p className="text-xs text-gray-500 mb-3">
          Belum ada journey untuk slug ini. Pastikan backend mengisi{' '}
          <code className="bg-slate-100 px-1 rounded">GET /api/v1/courses/:slug/journey</code> setelah program kelas
          disimpan (admin).
        </p>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-primary rounded-full" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="text-sm text-gray-500">
          Progress kursus: <span className="font-semibold text-gray-900">{progressPercent}%</span>
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Daftar Materi ({totalLessons} lesson)</h2>
        {modules.length === 0 ? (
          <p className="text-sm text-gray-500">
            Materi detail belum tersedia pada endpoint saat ini. Silakan lanjutkan dari jadwal kelas/rekaman yang diberikan
            mentor.
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

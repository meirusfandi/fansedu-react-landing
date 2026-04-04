import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  completeCourseLesson,
  getCourseJourney,
  getCourseLessonDetail,
  type LearningJourneyCourseDetailPayload,
  type LearningJourneyLessonDetail,
} from '../../lib/api'
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

/** Pratinjau / pengalaman journey untuk guru (GET /courses/:id/journey — hak akses di backend). */
export default function GuruCourseJourneyLearnPage({
  courseId,
  initialLessonId,
}: {
  courseId: string
  initialLessonId?: string
}) {
  const setCourseDetail = useLearningJourneyStore((s) => s.setCourseDetail)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [journeyDetail, setJourneyDetail] = useState<LearningJourneyCourseDetailPayload | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [lessonDetail, setLessonDetail] = useState<LearningJourneyLessonDetail | null>(null)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)

  const setHashLesson = useCallback((cid: string, lessonId: string) => {
    window.location.hash = `/guru/courses/${encodeURIComponent(cid)}/learn/lessons/${encodeURIComponent(lessonId)}`
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setJourneyDetail(null)
    setLessonDetail(null)
    setCompleteError(null)

    getCourseJourney(courseId)
      .then((journey) => {
        if (cancelled) return
        if (!journey || journey.sections.length === 0) {
          setError('Journey tidak ditemukan atau belum dibangun. Simpan program kelas di halaman Program.')
          return
        }
        setJourneyDetail(journey)
        setCourseDetail(courseId, journey)
        const pick =
          initialLessonId && journey.sections.some((s) => s.lessons.some((l) => l.id === initialLessonId))
            ? initialLessonId
            : firstSelectableLessonId(journey)
        setSelectedLessonId(pick)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Gagal memuat journey.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [courseId, initialLessonId, setCourseDetail])

  useEffect(() => {
    if (!journeyDetail || !selectedLessonId) {
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
  }, [journeyDetail, selectedLessonId])

  const onSelectLesson = useCallback(
    (lessonId: string) => {
      setCompleteError(null)
      setSelectedLessonId(lessonId)
      setHashLesson(courseId, lessonId)
    },
    [courseId, setHashLesson]
  )

  const onMarkComplete = useCallback(async () => {
    if (!selectedLessonId || !journeyDetail) return
    setCompleteLoading(true)
    setCompleteError(null)
    try {
      const res = await completeCourseLesson(selectedLessonId)
      const fresh = await getCourseJourney(courseId)
      if (fresh) {
        setJourneyDetail(fresh)
        setCourseDetail(courseId, fresh)
      }
      if (res.nextLessonId) {
        setSelectedLessonId(res.nextLessonId)
        setHashLesson(courseId, res.nextLessonId)
      }
    } catch (e) {
      setCompleteError(e instanceof ApiError ? e.message : 'Gagal menandai selesai.')
    } finally {
      setCompleteLoading(false)
    }
  }, [courseId, journeyDetail, selectedLessonId, setCourseDetail, setHashLesson])

  if (loading) return <div className="py-8 text-gray-500">Memuat journey…</div>
  if (error) {
    return (
      <div className="space-y-4">
        <a href="#/guru/courses" className="text-primary text-sm font-medium hover:underline">
          ← Kursus Saya
        </a>
        <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>
      </div>
    )
  }

  if (!journeyDetail) return null

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <a href="#/guru/courses" className="text-sm text-primary hover:underline">
          ← Kursus Saya
        </a>
        <a
          href={`#/guru/courses/${encodeURIComponent(courseId)}/program`}
          className="text-sm text-gray-600 hover:text-primary hover:underline"
        >
          Edit program kelas
        </a>
      </div>
      <div className="rounded-2xl border bg-white p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{journeyDetail.course.title}</h1>
        {journeyDetail.course.description ? (
          <p className="text-sm text-gray-600">{journeyDetail.course.description}</p>
        ) : null}
        <p className="text-xs text-gray-500 mt-2">
          Tampilan mengikuti alur siswa. Menandai selesai memerlukan progres user di backend (sesuai kebijakan API).
        </p>
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
        buildTryoutHref={(id) => `#/student/tryout/${encodeURIComponent(id)}`}
      />
    </div>
  )
}

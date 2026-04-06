import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  createSubscription,
  extractApiErrorCode,
  generateQuestions,
  getNationalRanking,
  getInstructorCourses,
  getInstructorStudents,
  listGeneratedQuestions,
  type AiGeneratedQuestion,
  type AiRankingItem,
  type InstructorCourseItem,
  type InstructorStudentItem,
} from '../../lib/api'

interface AssignmentDraft {
  id: string
  title: string
  courseId: string
  dueDate: string
  studentIds: string[]
  createdAt: string
}

const ASSIGNMENT_DRAFT_KEY = 'guru-assignment-drafts-v1'

function loadDrafts(): AssignmentDraft[] {
  const raw = window.localStorage.getItem(ASSIGNMENT_DRAFT_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as AssignmentDraft[] : []
  } catch {
    return []
  }
}

function saveDrafts(next: AssignmentDraft[]) {
  window.localStorage.setItem(ASSIGNMENT_DRAFT_KEY, JSON.stringify(next))
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function getFriendlyAiError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback
  const code = extractApiErrorCode(err.data)
  if (code === 'unauthorized' || err.status === 401) return 'Sesi login berakhir. Silakan login ulang.'
  if (code === 'validation_error' || err.status === 400) return 'Input belum valid. Periksa subject, grade, topic, dan jumlah soal.'
  if (code === 'service_unavailable' || err.status === 503) return 'AI Question Generator sedang tidak tersedia. Coba lagi sebentar.'
  return err.message || fallback
}

export default function GuruAssignmentsPage() {
  const [courses, setCourses] = useState<InstructorCourseItem[]>([])
  const [students, setStudents] = useState<InstructorStudentItem[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentDueDate, setAssignmentDueDate] = useState('')
  const [drafts, setDrafts] = useState<AssignmentDraft[]>([])
  const [subject, setSubject] = useState('math')
  const [grade, setGrade] = useState('smp')
  const [topic, setTopic] = useState('graph')
  const [difficulty, setDifficulty] = useState('medium')
  const [questions, setQuestions] = useState<AiGeneratedQuestion[]>([])
  const [ranking, setRanking] = useState<AiRankingItem[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setDrafts(loadDrafts())
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([getInstructorCourses(), getInstructorStudents(), getNationalRanking(10)])
      .then(([coursesRes, studentsRes, rankingRes]) => {
        if (cancelled) return
        const courseRows = coursesRes.status === 'fulfilled' ? coursesRes.value.data ?? [] : []
        const studentRows = studentsRes.status === 'fulfilled' ? studentsRes.value.data ?? [] : []
        setCourses(courseRows)
        setStudents(studentRows)
        setRanking(rankingRes.status === 'fulfilled' ? rankingRes.value : [])
        if (courseRows[0]) setSelectedCourseId((prev) => prev || courseRows[0].id)
        if (coursesRes.status === 'rejected' && studentsRes.status === 'rejected') {
          const rootErr = coursesRes.reason ?? studentsRes.reason
          setError(rootErr instanceof ApiError ? rootErr.message : 'Gagal memuat data tugas guru.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const leaderboard = useMemo(() => {
    return [...students]
      .sort((a, b) => b.progressPercent - a.progressPercent)
      .slice(0, 10)
  }, [students])

  const selectedCount = selectedStudentIds.length

  const onGenerateAssignmentQuestions = async () => {
    setLoadingQuestions(true)
    setError(null)
    try {
      const rows = await generateQuestions({
        subject,
        grade,
        topic,
        difficulty,
        count: 10,
      })
      setQuestions(rows)
    } catch (err) {
      setError(getFriendlyAiError(err, 'Gagal generate soal assignment.'))
    } finally {
      setLoadingQuestions(false)
    }
  }

  const onRefreshQuestionPool = async () => {
    setLoadingQuestions(true)
    setError(null)
    try {
      const rows = await listGeneratedQuestions({
        subject,
        grade,
        topic,
        difficulty,
        limit: 15,
      })
      setQuestions(rows)
    } catch (err) {
      setError(getFriendlyAiError(err, 'Gagal memuat pool soal.'))
    } finally {
      setLoadingQuestions(false)
    }
  }

  const onActivateTeacherSubscription = async () => {
    setSubscribing(true)
    setError(null)
    setSuccess(null)
    try {
      await createSubscription({ planCode: 'teacher_pro' })
      setSuccess('Subscription guru aktif.')
    } catch (err) {
      setError(getFriendlyAiError(err, 'Gagal aktivasi subscription guru.'))
    } finally {
      setSubscribing(false)
    }
  }

  const onCreateDraft = () => {
    setSuccess(null)
    setError(null)
    if (!selectedCourseId) {
      setError('Pilih kursus terlebih dahulu.')
      return
    }
    if (!assignmentTitle.trim()) {
      setError('Judul tugas wajib diisi.')
      return
    }
    if (!assignmentDueDate) {
      setError('Deadline wajib diisi.')
      return
    }
    if (selectedStudentIds.length === 0) {
      setError('Pilih minimal 1 siswa untuk assignment.')
      return
    }
    const next: AssignmentDraft[] = [
      {
        id: `draft-${Date.now()}`,
        title: assignmentTitle.trim(),
        courseId: selectedCourseId,
        dueDate: assignmentDueDate,
        studentIds: selectedStudentIds,
        createdAt: new Date().toISOString(),
      },
      ...drafts,
    ]
    setDrafts(next)
    saveDrafts(next)
    setAssignmentTitle('')
    setAssignmentDueDate('')
    setSelectedStudentIds([])
    setSuccess('Draft assignment tersimpan. Tinggal hubungkan endpoint assign saat backend siap.')
  }

  const onDownloadReport = () => {
    const rows = [
      'rank,name,email,programTitle,progressPercent',
      ...leaderboard.map((s, idx) =>
        `${idx + 1},"${s.name.replace(/"/g, '""')}","${s.email.replace(/"/g, '""')}","${s.programTitle.replace(/"/g, '""')}",${s.progressPercent}`
      ),
    ]
    downloadCsv(`guru-leaderboard-${todayStamp()}.csv`, rows.join('\n'))
  }

  if (loading) return <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">Memuat data kelas...</div>
  if (error && students.length === 0 && courses.length === 0) return <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Tugas Kelas & Leaderboard</h1>
        <p className="text-gray-500">Generate tugas untuk kelas, assign ke siswa, dan monitor progres mingguan.</p>
      </div>

      {error ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div> : null}
      {success ? <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{success}</div> : null}

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Generate & Assign Soal</h2>
        <div className="grid lg:grid-cols-4 gap-3 mb-4">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="subject (math)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
          <input
            type="text"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="grade (smp)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="topic (graph)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
          <input
            type="text"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            placeholder="difficulty"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Kursus</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Deadline</label>
            <input
              type="date"
              value={assignmentDueDate}
              onChange={(e) => setAssignmentDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">Judul tugas</label>
          <input
            type="text"
            value={assignmentTitle}
            onChange={(e) => setAssignmentTitle(e.target.value)}
            placeholder="Contoh: Latihan Persamaan Linear - Pekan 2"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>
        <div className="rounded-xl border border-slate-200 p-3 max-h-44 overflow-auto">
          <p className="text-xs text-gray-500 mb-2">Pilih siswa ({selectedCount} terpilih)</p>
          <div className="space-y-2">
            {students.map((s) => (
              <label key={s.userId} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedStudentIds.includes(s.userId)}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setSelectedStudentIds((prev) =>
                      checked ? [...prev, s.userId] : prev.filter((id) => id !== s.userId)
                    )
                  }}
                />
                <span>{s.name}</span>
                <span className="text-gray-400">({s.programTitle})</span>
              </label>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onCreateDraft}
          className="mt-4 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover"
        >
          Simpan Draft Assignment
        </button>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            onClick={onGenerateAssignmentQuestions}
            disabled={loadingQuestions}
            className="px-3 py-2 rounded-lg border border-primary/40 text-primary text-sm hover:bg-primary/5 disabled:opacity-60"
          >
            {loadingQuestions ? 'Generating...' : 'Generate Soal AI'}
          </button>
          <button
            type="button"
            onClick={onRefreshQuestionPool}
            disabled={loadingQuestions}
            className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 disabled:opacity-60"
          >
            Refresh Question Pool
          </button>
          <button
            type="button"
            onClick={onActivateTeacherSubscription}
            disabled={subscribing}
            className="px-3 py-2 rounded-lg border border-primary/40 text-primary text-sm hover:bg-primary/5 disabled:opacity-60"
          >
            {subscribing ? 'Memproses...' : 'Aktifkan Subscription Guru'}
          </button>
        </div>
        {questions.length > 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 p-3 space-y-2 max-h-56 overflow-auto">
            {questions.slice(0, 8).map((q) => (
              <div key={q.id} className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                <p className="text-xs text-gray-500 mb-1">{q.topic} - {q.difficulty}</p>
                <p className="text-sm text-gray-900">{q.questionText}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-gray-900">Leaderboard Kelas</h2>
          <button
            type="button"
            onClick={onDownloadReport}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
          >
            Download Laporan CSV
          </button>
        </div>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada data progres siswa.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((row, idx) => (
              <div key={row.userId} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">#{idx + 1} {row.name}</p>
                  <p className="text-xs text-gray-500">{row.programTitle}</p>
                </div>
                <p className="text-sm font-bold text-primary">{row.progressPercent}%</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Ranking Nasional (Global)</h2>
        {ranking.length === 0 ? (
          <p className="text-sm text-gray-500">Ranking global belum tersedia.</p>
        ) : (
          <div className="space-y-2">
            {ranking.slice(0, 8).map((row, idx) => (
              <div key={row.userId} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-sm">
                <p className="text-gray-700">#{idx + 1} - {row.userId}</p>
                <p className="font-semibold text-primary">{row.score} ({row.accuracyPct.toFixed(1)}%)</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Draft Assignment</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada draft tugas.</p>
        ) : (
          <div className="space-y-2">
            {drafts.slice(0, 8).map((draft) => {
              const courseName = courses.find((c) => c.id === draft.courseId)?.title ?? 'Kursus'
              return (
                <div key={draft.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-gray-900">{draft.title}</p>
                  <p className="text-xs text-gray-600">
                    {courseName} - {draft.studentIds.length} siswa - deadline {draft.dueDate}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

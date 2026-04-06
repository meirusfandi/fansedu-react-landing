import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  createSubscription,
  extractApiErrorCode,
  generateQuestions,
  getNationalRanking,
  getOpenTryouts,
  getQuestionAnalysis,
  getRegisterMasterData,
  getStudentAttempts,
  submitAnswer,
  type AiAnalysisResponse,
  type AiGeneratedQuestion,
  type AiRankingItem,
  type SubmitAiAnswerResponse,
  type OpenTryoutItem,
  type RegisterLevelOption,
} from '../../lib/api'

type Difficulty = 'easy' | 'medium' | 'hard' | 'olympiad'

interface DailyEngagementState {
  streakDays: number
  lastVisitDate: string
  points: number
}

const ENGAGEMENT_KEY = 'student-practice-engagement-v1'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function loadEngagement(): DailyEngagementState {
  const raw = window.localStorage.getItem(ENGAGEMENT_KEY)
  if (!raw) return { streakDays: 1, lastVisitDate: todayKey(), points: 10 }
  try {
    const parsed = JSON.parse(raw) as Partial<DailyEngagementState>
    return {
      streakDays: Math.max(1, Number(parsed.streakDays ?? 1)),
      lastVisitDate: String(parsed.lastVisitDate ?? todayKey()),
      points: Math.max(0, Number(parsed.points ?? 0)),
    }
  } catch {
    return { streakDays: 1, lastVisitDate: todayKey(), points: 10 }
  }
}

function saveEngagement(next: DailyEngagementState) {
  window.localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(next))
}

function computeBadges(streakDays: number, points: number): string[] {
  const badges: string[] = []
  if (streakDays >= 3) badges.push('3 Hari Konsisten')
  if (streakDays >= 7) badges.push('Mingguan Champion')
  if (points >= 100) badges.push('Point Hunter')
  return badges
}

function getFriendlyAiError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback
  const code = extractApiErrorCode(err.data)
  if (code === 'unauthorized' || err.status === 401) return 'Sesi login berakhir. Silakan login ulang.'
  if (code === 'validation_error' || err.status === 400) return 'Input belum valid. Periksa subject, grade, topic, dan jumlah soal.'
  if (code === 'service_unavailable' || err.status === 503) return 'AI Question Generator sedang tidak tersedia. Coba lagi sebentar.'
  return err.message || fallback
}

export default function StudentPracticePage() {
  const [levels, setLevels] = useState<RegisterLevelOption[]>([])
  const [tryouts, setTryouts] = useState<OpenTryoutItem[]>([])
  const [levelId, setLevelId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [questionCount, setQuestionCount] = useState(20)
  const [topic, setTopic] = useState('graph')
  const [questions, setQuestions] = useState<AiGeneratedQuestion[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [submitResult, setSubmitResult] = useState<SubmitAiAnswerResponse | null>(null)
  const [analysis, setAnalysis] = useState<AiAnalysisResponse | null>(null)
  const [ranking, setRanking] = useState<AiRankingItem[]>([])
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [engagement, setEngagement] = useState<DailyEngagementState | null>(null)
  const [lowScoreAttempts, setLowScoreAttempts] = useState(0)

  useEffect(() => {
    const current = loadEngagement()
    const today = todayKey()
    if (current.lastVisitDate !== today) {
      const prev = new Date(current.lastVisitDate)
      const now = new Date(today)
      const dayMs = 24 * 60 * 60 * 1000
      const diff = Math.round((now.getTime() - prev.getTime()) / dayMs)
      const streakDays = diff === 1 ? current.streakDays + 1 : 1
      const next = { streakDays, lastVisitDate: today, points: current.points + 10 }
      saveEngagement(next)
      setEngagement(next)
      return
    }
    setEngagement(current)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.allSettled([
      getRegisterMasterData(),
      getOpenTryouts(),
      getStudentAttempts(),
      getNationalRanking(10),
    ])
      .then(([masterRes, tryoutRes, attemptsRes, rankingRes]) => {
        if (cancelled) return
        const levelRows = masterRes.status === 'fulfilled' ? masterRes.value.levels ?? [] : []
        const tryoutRows = tryoutRes.status === 'fulfilled' ? tryoutRes.value ?? [] : []
        const attemptRows = attemptsRes.status === 'fulfilled' ? attemptsRes.value ?? [] : []
        const rankingRows = rankingRes.status === 'fulfilled' ? rankingRes.value ?? [] : []
        setLevels(levelRows)
        setTryouts(tryoutRows)
        setRanking(rankingRows)
        setLowScoreAttempts(attemptRows.filter((a) => (a.score ?? 0) < 60).length)
        if (levelRows[0]) {
          setLevelId((prev) => prev || levelRows[0].id)
          setSubjectId((prev) => prev || levelRows[0].subjects[0]?.id || '')
        }
        if (masterRes.status === 'rejected' && tryoutRes.status === 'rejected') {
          const rootErr = masterRes.reason ?? tryoutRes.reason
          setError(rootErr instanceof ApiError ? rootErr.message : 'Gagal memuat practice arena.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedLevel = useMemo(
    () => levels.find((l) => l.id === levelId) ?? null,
    [levels, levelId],
  )

  useEffect(() => {
    if (!selectedLevel) return
    setSubjectId((prev) => {
      if (prev && selectedLevel.subjects.some((s) => s.id === prev)) return prev
      return selectedLevel.subjects[0]?.id ?? ''
    })
  }, [selectedLevel])

  const selectedSubjectName = useMemo(() => {
    if (!selectedLevel) return ''
    return selectedLevel.subjects.find((s) => s.id === subjectId)?.name ?? ''
  }, [selectedLevel, subjectId])

  const selectedSubjectSlug = useMemo(() => {
    if (!selectedLevel) return ''
    return selectedLevel.subjects.find((s) => s.id === subjectId)?.slug ?? ''
  }, [selectedLevel, subjectId])

  const recommendedTryouts = useMemo(() => {
    if (!selectedSubjectName) return tryouts.slice(0, 5)
    const needle = selectedSubjectName.toLowerCase()
    const sorted = [...tryouts].sort((a, b) => Number(Boolean(b.badge)) - Number(Boolean(a.badge)))
    const matched = sorted.filter((item) => item.title.toLowerCase().includes(needle))
    if (matched.length > 0) return matched.slice(0, 5)
    return sorted.slice(0, 5)
  }, [tryouts, selectedSubjectName])

  const badges = useMemo(() => {
    if (!engagement) return []
    return computeBadges(engagement.streakDays, engagement.points)
  }, [engagement])

  const startHref = useMemo(() => {
    const first = recommendedTryouts[0]
    if (!first) return '#/student/tryout'
    return `#/student/tryout/${encodeURIComponent(first.id)}`
  }, [recommendedTryouts])

  const activeQuestion = questions[activeIndex] ?? null

  const onGenerateQuestions = async () => {
    if (!selectedLevel || !selectedSubjectSlug || !topic.trim()) {
      setError('Jenjang, bidang, dan topik wajib dipilih.')
      return
    }
    setGenerating(true)
    setError(null)
    setSubmitResult(null)
    try {
      const rows = await generateQuestions({
        subject: selectedSubjectSlug,
        grade: selectedLevel.slug,
        topic: topic.trim(),
        difficulty,
        count: questionCount,
      })
      setQuestions(rows)
      setActiveIndex(0)
      setSelectedAnswer('')
      const nextAnalysis = await getQuestionAnalysis({
        topic: topic.trim(),
        grade: selectedLevel.slug,
      })
      setAnalysis(nextAnalysis)
    } catch (err) {
      setError(getFriendlyAiError(err, 'Gagal generate soal.'))
    } finally {
      setGenerating(false)
    }
  }

  const onSubmitAnswer = async () => {
    if (!activeQuestion || !selectedAnswer) return
    setSubmitting(true)
    setError(null)
    try {
      const timeSpentMs = Math.max(1000, (activeQuestion.estimatedSec ?? 60) * 1000)
      const res = await submitAnswer({
        questionId: activeQuestion.id,
        answer: selectedAnswer,
        timeSpentMs,
      })
      setSubmitResult(res)
      const nextAnalysis = await getQuestionAnalysis({
        topic: activeQuestion.topic || topic.trim(),
        grade: selectedLevel?.slug,
      })
      setAnalysis(nextAnalysis)
      if (res.isCorrect) {
        setEngagement((prev) => {
          if (!prev) return prev
          const next = { ...prev, points: prev.points + 5 }
          saveEngagement(next)
          return next
        })
      }
    } catch (err) {
      setError(getFriendlyAiError(err, 'Gagal submit jawaban.'))
    } finally {
      setSubmitting(false)
    }
  }

  const onActivateSubscription = async () => {
    setSubscribing(true)
    setError(null)
    try {
      await createSubscription({ planCode: 'student_plus' })
      setEngagement((prev) => {
        if (!prev) return prev
        const next = { ...prev, points: prev.points + 20 }
        saveEngagement(next)
        return next
      })
    } catch (err) {
      setError(getFriendlyAiError(err, 'Gagal mengaktifkan subscription.'))
    } finally {
      setSubscribing(false)
    }
  }

  if (loading) return <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">Memuat practice arena...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Practice Arena Siswa</h1>
        <p className="text-gray-500">Generate latihan cepat, jaga streak, dan naikkan ranking harianmu.</p>
      </div>
      {error ? <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</div> : null}

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Streak Harian</p>
          <p className="text-2xl font-bold text-primary">{engagement?.streakDays ?? 1} hari</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Practice Point</p>
          <p className="text-2xl font-bold text-gray-900">{engagement?.points ?? 0}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Topik Lemah Terdeteksi</p>
          <p className="text-2xl font-bold text-gray-900">{lowScoreAttempts}</p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Generate Soal by Topic & Level</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={levelId}
            onChange={(e) => setLevelId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          >
            {levels.map((level) => (
              <option key={level.id} value={level.id}>{level.name}</option>
            ))}
          </select>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          >
            {selectedLevel?.subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="olympiad">Olympiad</option>
          </select>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            placeholder="Topic (contoh: graph)"
          />
          <input
            type="number"
            min={5}
            max={60}
            value={questionCount}
            onChange={(e) => setQuestionCount(Math.max(5, Math.min(60, Number(e.target.value) || 20)))}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            type="button"
            onClick={onGenerateQuestions}
            disabled={generating}
            className="inline-flex px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
          >
            {generating ? 'Generating...' : `Generate AI Questions (${questionCount})`}
          </button>
          <a
            href={startHref}
            className="inline-flex px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Buka Tryout Rekomendasi
          </a>
          <button
            type="button"
            onClick={onActivateSubscription}
            disabled={subscribing}
            className="inline-flex px-4 py-2.5 rounded-xl border border-primary/40 text-primary text-sm font-semibold hover:bg-primary/5 disabled:opacity-60"
          >
            {subscribing ? 'Memproses...' : 'Aktifkan Subscription Pro'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Sesi Soal AI</h2>
        {!activeQuestion ? (
          <p className="text-sm text-gray-500">Belum ada soal. Generate dulu untuk mulai sesi latihan.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs text-gray-500 mb-1">
                Soal {activeIndex + 1}/{questions.length} - {activeQuestion.topic} - {activeQuestion.difficulty}
              </p>
              <p className="text-sm text-gray-900">{activeQuestion.questionText}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              {activeQuestion.choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setSelectedAnswer(choice)}
                  className={`rounded-lg border px-3 py-2 text-sm text-left ${
                    selectedAnswer === choice ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSubmitAnswer}
                disabled={!selectedAnswer || submitting}
                className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
              >
                {submitting ? 'Mengirim...' : 'Submit Jawaban'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitResult(null)
                  setSelectedAnswer('')
                  setActiveIndex((prev) => Math.min(prev + 1, Math.max(0, questions.length - 1)))
                }}
                disabled={activeIndex >= questions.length - 1}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Soal Berikutnya
              </button>
            </div>
            {submitResult ? (
              <div className={`rounded-lg p-3 text-sm ${submitResult.isCorrect ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                <p className="font-semibold mb-1">{submitResult.isCorrect ? 'Jawaban benar' : 'Jawaban belum tepat'}</p>
                {submitResult.correctAnswer ? <p>Kunci jawaban: {submitResult.correctAnswer}</p> : null}
                {submitResult.explanation ? <p className="mt-1 whitespace-pre-line">{submitResult.explanation}</p> : null}
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Analysis</h2>
          {!analysis ? (
            <p className="text-sm text-gray-500">Belum ada analisis. Submit minimal 1 jawaban.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="text-gray-700">Akurasi: <span className="font-semibold text-gray-900">{analysis.accuracyPercent.toFixed(1)}%</span></p>
                <p className="text-gray-700">Total attempt: <span className="font-semibold text-gray-900">{analysis.totalAttempts}</span></p>
                <p className="text-gray-700">Avg time: <span className="font-semibold text-gray-900">{Math.round(analysis.avgTimeMs / 1000)} detik</span></p>
                <p className="text-gray-700">Weak topic: <span className="font-semibold text-gray-900">{analysis.weakTopic || '-'}</span></p>
              </div>
              {analysis.recommendations.length > 0 ? (
                <div className="rounded-lg border border-slate-200 p-2.5 bg-slate-50">
                  <p className="text-xs text-gray-500 mb-1">Rekomendasi materi berikutnya:</p>
                  {analysis.recommendations.slice(0, 2).map((item) => (
                    <p key={item.id} className="text-xs text-gray-700 line-clamp-2">- {item.questionText}</p>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Ranking Nasional</h2>
          {ranking.length === 0 ? (
            <p className="text-sm text-gray-500">Ranking belum tersedia.</p>
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
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Rekomendasi Soal Otomatis</h2>
        {recommendedTryouts.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada tryout tersedia. Coba lagi beberapa saat.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {recommendedTryouts.map((item) => (
              <a
                key={item.id}
                href={`#/student/tryout/${encodeURIComponent(item.id)}`}
                className="rounded-xl border border-slate-200 p-4 hover:border-primary/30 hover:bg-slate-50"
              >
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {item.badge ? `${item.badge} - ` : ''}Skor maks {item.maxScore ?? 100}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Badge & Daily Return</h2>
        {badges.length === 0 ? (
          <p className="text-sm text-gray-600">Capai streak minimal 3 hari untuk membuka badge pertamamu.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span key={badge} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                {badge}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3">
          Datang tiap hari memberi +10 point streak. Point dipakai untuk unlock rekomendasi premium dan event ranking mingguan.
        </p>
      </section>
    </div>
  )
}

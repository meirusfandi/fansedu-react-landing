import { useState, useEffect } from 'react'
import type {
  LearningJourneyCourseDetailPayload,
  LearningJourneyLessonDetail,
  InClassQuizQuestion,
} from '../../lib/api'

function getEmbedVideoUrl(url?: string): string | null {
  if (!url) return null
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return null
}

export interface LearningJourneyCourseViewProps {
  detail: LearningJourneyCourseDetailPayload
  lessonDetail: LearningJourneyLessonDetail | null
  lessonLoading: boolean
  selectedLessonId: string | null
  onSelectLesson: (lessonId: string) => void
  onMarkComplete: () => void
  completeLoading: boolean
  completeError: string | null
  /** Link ke halaman tryout untuk lesson quiz + tryoutSessionId (default: #/student/tryout/:id) */
  buildTryoutHref?: (tryoutSessionId: string) => string
}

export function LearningJourneyCourseView({
  detail,
  lessonDetail,
  lessonLoading,
  selectedLessonId,
  onSelectLesson,
  onMarkComplete,
  completeLoading,
  completeError,
  buildTryoutHref = (id) => `#/student/tryout/${encodeURIComponent(id)}`,
}: LearningJourneyCourseViewProps) {
  const pct = Math.min(100, Math.max(0, detail.progressPercent))

  // State untuk kuis / pre-test / post-test interaktif di dalam kelas
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState<number | null>(null)

  // Reset status kuis saat siswa berpindah lesson
  useEffect(() => {
    setQuizAnswers({})
    setQuizSubmitted(false)
    setQuizScore(null)
  }, [selectedLessonId])

  const handleSelectQuizOption = (questionId: string, value: string) => {
    if (quizSubmitted) return
    setQuizAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleToggleMultiOption = (questionId: string, key: string) => {
    if (quizSubmitted) return
    const current = (quizAnswers[questionId] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const set = new Set(current)
    if (set.has(key)) set.delete(key)
    else set.add(key)
    const next = Array.from(set).sort().join(',')
    setQuizAnswers((prev) => ({ ...prev, [questionId]: next }))
  }

  const handleGradeQuiz = (questions: InClassQuizQuestion[]) => {
    if (questions.length === 0) return
    let correctCount = 0
    for (const q of questions) {
      const studentAns = (quizAnswers[q.id] || '').trim().toLowerCase()
      const correctAns = (q.correctAnswer || '').trim().toLowerCase()
      if (studentAns === correctAns) {
        correctCount++
      }
    }
    const finalScore = Math.round((correctCount / questions.length) * 100)
    setQuizScore(finalScore)
    setQuizSubmitted(true)
  }

  const renderBadgeForType = (type: string) => {
    switch (type) {
      case 'pre_test':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">PRE-TEST</span>
      case 'meeting':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">PERTEMUAN</span>
      case 'live':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">LIVE CLASS</span>
      case 'pdf':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">PDF DOC</span>
      case 'slide':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">PPT SLIDE</span>
      case 'video':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">RECORDING</span>
      case 'assets':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">ASSETS</span>
      case 'quiz':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">QUIZ</span>
      case 'post_test':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">POST-TEST</span>
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{type.toUpperCase()}</span>
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[520px]">
      {/* Sidebar Kurikulum & Pertemuan */}
      <aside className="lg:w-80 shrink-0 rounded-3xl border border-slate-200/90 bg-white p-5 max-h-[78vh] overflow-y-auto shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Silabus Pertemuan</p>
          <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
            {pct.toFixed(0)}% Tuntas
          </span>
        </div>

        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-teal-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-500 mb-5">
          {detail.completedLessons} dari {detail.totalLessons} materi &amp; tes selesai
        </p>

        <nav className="space-y-5">
          {detail.sections.map((sec) => (
            <div key={sec.id} className="border-b border-slate-100 pb-4 last:border-b-0">
              <p className="text-xs font-bold text-slate-800 mb-2.5 leading-snug">{sec.title}</p>
              <ul className="space-y-1.5">
                {sec.lessons.map((l) => {
                  const active = l.id === selectedLessonId
                  const disabled = l.locked
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelectLesson(l.id)}
                        className={`w-full text-left text-xs rounded-xl p-2.5 transition-all ${
                          active
                            ? 'bg-teal-50 text-teal-900 font-bold ring-1 ring-teal-500/30 shadow-xs'
                            : 'text-slate-700 hover:bg-slate-50'
                        } ${disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0">
                            {l.completed ? (
                              <span className="text-emerald-600 font-bold">✓</span>
                            ) : disabled ? (
                              <span>🔒</span>
                            ) : (
                              <span className="text-slate-300">○</span>
                            )}
                          </span>
                          <span className="line-clamp-2 leading-tight flex-1">{l.title}</span>
                        </div>
                        <div className="ml-5 mt-1.5 flex items-center gap-1.5">
                          {renderBadgeForType(l.type)}
                          {l.tryoutSessionId ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">TRYOUT</span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 min-w-0 shadow-xs">
        {lessonLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-slate-500 text-xs sm:text-sm font-medium">Memuat materi pembelajaran…</p>
          </div>
        ) : !lessonDetail ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm font-medium">Pilih materi atau pertemuan di menu sebelah kiri.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Lesson */}
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 mb-2">
                {renderBadgeForType(lessonDetail.type)}
                {lessonDetail.completed ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Selesai Dipelajari ✓
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Sedang Dipelajari
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {lessonDetail.title}
              </h2>
            </div>

            {lessonDetail.locked ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs sm:text-sm text-amber-900 font-medium">
                🔒 Materi ini masih terkunci. Selesaikan materi sebelumnya terlebih dahulu.
              </div>
            ) : null}

            {/* 1. DETAIL PERTEMUAN (MEETING DETAILS & LIVE CLASS ZOOM/MEET) */}
            {lessonDetail.meetingInfo || lessonDetail.type === 'meeting' ? (
              <div className="rounded-3xl border-2 border-teal-500/30 bg-gradient-to-br from-teal-50/70 via-white to-teal-50/30 p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-600 text-white shadow-xs">
                    Pertemuan #{lessonDetail.meetingInfo?.meetingNumber ?? 1}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    lessonDetail.meetingInfo?.status === 'live'
                      ? 'bg-rose-500 text-white animate-pulse'
                      : lessonDetail.meetingInfo?.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-sky-100 text-sky-800 border-sky-200'
                  }`}>
                    {lessonDetail.meetingInfo?.status === 'live' ? '● LIVE SEKARANG' : lessonDetail.meetingInfo?.status === 'completed' ? 'Selesai Dilaksanakan' : 'Terjadwal'}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                    {lessonDetail.meetingInfo?.topic || lessonDetail.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    Sesi tatap muka langsung via telekonferensi untuk pembahasan konsep, bedah soal HOTS, dan konsultasi interaktif bersama mentor.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Tanggal &amp; Hari:</span>
                    <span className="font-bold text-slate-800">{lessonDetail.meetingInfo?.dateText || 'Selasa, 14 Oktober 2026'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Waktu / Jam:</span>
                    <span className="font-bold text-slate-800">{lessonDetail.meetingInfo?.timeText || '19:30 - 21:00 WIB'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Mentor Pengajar:</span>
                    <span className="font-bold text-teal-700">{lessonDetail.meetingInfo?.mentorName || 'Kak Meirusfandi (TeachSync)'}</span>
                  </div>
                </div>

                {lessonDetail.liveClassUrl ? (
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <a
                      href={lessonDetail.liveClassUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 text-white px-6 py-3.5 text-sm font-bold hover:bg-teal-700 shadow-md transition-all hover:scale-[1.01]"
                    >
                      <span>Masuk ke Ruang Live Class (Zoom / Meet) 🎥</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <span className="text-xs text-slate-500">
                      Disarankan bergabung 5 menit sebelum jadwal sesi dimulai.
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* 2. RECORDING ZOOM (UPLOAD KE YOUTUBE) */}
            {lessonDetail.recordingUrl || (lessonDetail.type === 'video' && lessonDetail.videoUrl) ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📹</span>
                    <h3 className="text-base font-bold text-slate-900">
                      Rekaman Zoom Kelas (YouTube)
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Full HD 1080p · Bisa Diulang Kapan Saja
                  </span>
                </div>

                <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video shadow-md border border-slate-800">
                  {getEmbedVideoUrl(lessonDetail.recordingUrl || lessonDetail.videoUrl) ? (
                    <iframe
                      key={lessonDetail.id}
                      title={lessonDetail.title}
                      src={getEmbedVideoUrl(lessonDetail.recordingUrl || lessonDetail.videoUrl)!}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      key={lessonDetail.id}
                      className="w-full h-full"
                      src={lessonDetail.recordingUrl || lessonDetail.videoUrl}
                      controls
                      playsInline
                    >
                      Browser tidak mendukung pemutaran video langsung.
                    </video>
                  )}
                </div>
                <p className="text-xs text-slate-500 italic">
                  💡 Gunakan fitur kecepatan 1.25x - 1.5x di YouTube untuk mengulang materi lebih cepat.
                </p>
              </div>
            ) : null}

            {/* 3. MODUL PPT (SLIDE PRESENTASI & RANGKUMAN) */}
            {lessonDetail.slideUrl ? (
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="bg-slate-50 px-4 py-3 text-xs text-slate-700 flex justify-between items-center gap-2 border-b border-slate-200">
                  <span className="font-bold flex items-center gap-1.5 text-amber-700">
                    <span>📊</span> Slide Presentasi &amp; Peta Konsep (PPT)
                  </span>
                  <a
                    href={lessonDetail.slideUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 font-semibold hover:underline"
                  >
                    Buka Presentasi di Tab Baru →
                  </a>
                </div>
                <iframe
                  title="Slide Presentasi PPT"
                  src={lessonDetail.slideUrl}
                  className="w-full h-[min(70vh,520px)] bg-white"
                  allowFullScreen
                />
              </div>
            ) : null}

            {/* 4. MODUL PDF DOC (DOKUMEN MATERI) */}
            {lessonDetail.pdfUrl ? (
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="bg-slate-50 px-4 py-3 text-xs text-slate-700 flex justify-between items-center gap-2 border-b border-slate-200">
                  <span className="font-bold flex items-center gap-1.5 text-rose-700">
                    <span>📄</span> Dokumen Modul Pembelajaran (PDF Doc)
                  </span>
                  <a
                    href={lessonDetail.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 font-semibold hover:underline"
                  >
                    Unduh / Buka Dokumen PDF →
                  </a>
                </div>
                <iframe
                  title="Dokumen Modul PDF"
                  src={lessonDetail.pdfUrl}
                  className="w-full h-[min(70vh,520px)] bg-white"
                />
              </div>
            ) : null}

            {/* 5. ASSETS & BERKAS PEMBELAJARAN PENDUKUNG */}
            {lessonDetail.assets && lessonDetail.assets.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📁</span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Berkas &amp; Assets Pembelajaran Pendukung
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {lessonDetail.assets.length} berkas
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lessonDetail.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-xs hover:border-teal-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">
                          {asset.type === 'pdf' ? '📄' : asset.type === 'zip' ? '📦' : asset.type === 'code' ? '💻' : '📝'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{asset.name}</p>
                          {asset.size && <span className="text-[10px] text-slate-400">{asset.size}</span>}
                        </div>
                      </div>
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold hover:bg-teal-600 hover:text-white transition-colors shrink-0"
                      >
                        Unduh
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 6. PRE-TEST, QUIZ, & POST-TEST INTERAKTIF DALAM KELAS */}
            {lessonDetail.quizQuestions && lessonDetail.quizQuestions.length > 0 ? (
              <div className="rounded-3xl border-2 border-teal-500/30 bg-white p-6 sm:p-7 shadow-xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {lessonDetail.type === 'pre_test' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                          🏁 Pre-Test
                        </span>
                      ) : lessonDetail.type === 'post_test' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          🎯 Post-Test
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-yellow-100 text-yellow-800 border border-yellow-200">
                          ⚡ Quiz Materi
                        </span>
                      )}
                      <h3 className="text-lg font-extrabold text-slate-900">
                        {lessonDetail.quizTitle || 'Evaluasi Pembelajaran'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">
                      {lessonDetail.type === 'pre_test'
                        ? 'Tes awal untuk mengukur pemahaman dasarmu sebelum memulai materi pertemuan.'
                        : lessonDetail.type === 'post_test'
                          ? 'Tes akhir untuk mengukur peningkatan kompetensimu setelah menyelesaikan pertemuan ini.'
                          : 'Kuis interaktif untuk menguji pemahaman materi yang baru saja kamu pelajari.'}
                    </p>
                  </div>

                  {quizSubmitted && quizScore !== null ? (
                    <div className="px-4 py-2 rounded-2xl bg-teal-50 border border-teal-200 text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Skor Akhir</span>
                      <span className="text-xl font-extrabold text-teal-800">{quizScore} / 100</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">
                      {lessonDetail.quizQuestions.length} Soal
                    </span>
                  )}
                </div>

                {/* Daftar Pertanyaan Kuis */}
                <div className="space-y-6">
                  {lessonDetail.quizQuestions.map((q, idx) => {
                    const studentAns = quizAnswers[q.id] || ''
                    const isCorrect = quizSubmitted && studentAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                    const isWrong = quizSubmitted && studentAns.trim().toLowerCase() !== q.correctAnswer.trim().toLowerCase()

                    return (
                      <div
                        key={q.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          quizSubmitted
                            ? isCorrect
                              ? 'border-emerald-300 bg-emerald-50/30'
                              : 'border-rose-300 bg-rose-50/30'
                            : 'border-slate-200 bg-slate-50/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <p className="font-bold text-sm text-slate-900 leading-snug">
                            <span className="text-teal-700 mr-1.5">Soal #{idx + 1}.</span> {q.prompt}
                          </p>
                          {quizSubmitted && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isCorrect ? 'Benar ✓' : 'Salah ✕'}
                            </span>
                          )}
                        </div>

                        {/* Opsi Soal Pilihan Ganda / Benar Salah / Multi-Select */}
                        {q.questionType === 'multiple_choice' || q.questionType === 'true_false' ? (
                          <div className="space-y-2 mt-2">
                            {(q.options || []).map((opt) => {
                              const checked = studentAns === opt.key
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  disabled={quizSubmitted}
                                  onClick={() => handleSelectQuizOption(q.id, opt.key)}
                                  className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between ${
                                    checked
                                      ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold ring-1 ring-teal-500/30'
                                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-bold text-teal-700">{opt.key}.</span>
                                    <span>{opt.label}</span>
                                  </div>
                                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                    checked ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300'
                                  }`}>
                                    {checked && '✓'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        ) : q.questionType === 'multi_select' ? (
                          <div className="space-y-2 mt-2">
                            {(q.options || []).map((opt) => {
                              const selectedKeys = studentAns.split(',').map((s) => s.trim()).filter(Boolean)
                              const checked = selectedKeys.includes(opt.key)
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  disabled={quizSubmitted}
                                  onClick={() => handleToggleMultiOption(q.id, opt.key)}
                                  className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between ${
                                    checked
                                      ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold ring-1 ring-teal-500/30'
                                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-bold text-teal-700">{opt.key}.</span>
                                    <span>{opt.label}</span>
                                  </div>
                                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                                    checked ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300'
                                  }`}>
                                    {checked && '✓'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          /* Isian Singkat */
                          <div className="mt-2">
                            <input
                              type="text"
                              disabled={quizSubmitted}
                              value={studentAns}
                              onChange={(e) => handleSelectQuizOption(q.id, e.target.value)}
                              placeholder="Ketik jawaban singkat di sini..."
                              className="w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm outline-none focus:border-teal-500 bg-white"
                            />
                          </div>
                        )}

                        {/* Pembahasan Soal jika kuis sudah di-submit */}
                        {quizSubmitted && q.explanation && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-100 text-xs text-slate-700 space-y-1">
                            <p className="font-bold text-teal-800">
                              Kunci Jawaban: {q.correctAnswer.toUpperCase()}
                            </p>
                            <p className="leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Tombol Aksi Kuis */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {!quizSubmitted ? (
                    <button
                      type="button"
                      onClick={() => handleGradeQuiz(lessonDetail.quizQuestions!)}
                      className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.01]"
                    >
                      Periksa Jawaban &amp; Selesaikan Tes
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setQuizSubmitted(false)
                        setQuizAnswers({})
                        setQuizScore(null)
                      }}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                    >
                      Ulangi Tes
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* 7. TRYOUT KELAS TERKAIT */}
            {lessonDetail.type === 'quiz' && lessonDetail.tryoutSessionId ? (
              <div className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/70 to-white p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                    Simulasi Tryout Kelas
                  </span>
                  <span className="text-xs text-emerald-800 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Format Standar Resmi OSN &amp; TKA
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Evaluasi Kemampuan &amp; Peringkat Nasional
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Selesaikan simulasi tryout untuk menguji pemahaman materi pada kelas ini. Terdiri dari berbagai jenis soal (PG, Benar/Salah, Multi-Select, Isian Singkat, &amp; Coding).
                </p>
                <div className="pt-1">
                  <a
                    href={buildTryoutHref(lessonDetail.tryoutSessionId)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-7 py-3.5 text-sm font-bold hover:bg-emerald-700 shadow-md transition-all hover:scale-[1.01]"
                  >
                    <span>Mulai Ujian Tryout Kelas Ini 🚀</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            ) : null}

            {/* Detail Teks / Catatan Pembelajaran */}
            {lessonDetail.detailText ? (
              <div className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-100">
                {lessonDetail.detailText}
              </div>
            ) : null}

            {completeError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800 font-medium">
                {completeError}
              </div>
            ) : null}

            {/* Tombol Tandai Selesai (Progress Tracking) */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Tandai selesai untuk memperbarui progres belajarmu.
              </span>
              <button
                type="button"
                disabled={lessonDetail.locked || lessonDetail.completed || completeLoading}
                onClick={onMarkComplete}
                className={`inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-xs ${
                  lessonDetail.completed
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default'
                    : 'bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]'
                }`}
              >
                {completeLoading ? 'Menyimpan…' : lessonDetail.completed ? 'Sudah Selesai ✓' : 'Tandai Selesai & Lanjut →'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

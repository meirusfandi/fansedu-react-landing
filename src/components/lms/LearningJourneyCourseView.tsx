import type { LearningJourneyCourseDetailPayload, LearningJourneyLessonDetail } from '../../lib/api'

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

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[480px]">
      <aside className="lg:w-80 shrink-0 rounded-2xl border bg-white p-4 max-h-[70vh] overflow-y-auto">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kurikulum</p>
        {detail.trackType ? (
          <p className="text-[10px] text-gray-500 mb-2">
            Track: <span className="font-medium text-gray-700">{detail.trackType}</span>
          </p>
        ) : null}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-600 mb-4">
          {detail.completedLessons}/{detail.totalLessons} lesson selesai · {pct.toFixed(0)}%
        </p>
        <nav className="space-y-4">
          {detail.sections.map((sec) => (
            <div key={sec.id}>
              <p className="text-sm font-semibold text-gray-900 mb-2">{sec.title}</p>
              <ul className="space-y-1">
                {sec.lessons.map((l) => {
                  const active = l.id === selectedLessonId
                  const disabled = l.locked
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelectLesson(l.id)}
                        className={`w-full text-left text-sm rounded-lg px-3 py-2 transition-colors ${
                          active ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700 hover:bg-slate-50'
                        } ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}`}
                      >
                        <span className="flex items-center gap-2">
                          {l.completed ? (
                            <span className="text-emerald-600" aria-hidden>
                              ✓
                            </span>
                          ) : null}
                          {disabled ? <span aria-hidden>🔒</span> : null}
                          <span className="line-clamp-2">{l.title}</span>
                        </span>
                        <span className="block text-[10px] text-gray-400 mt-0.5 uppercase">
                          {l.type}
                          {l.tryoutSessionId ? ' · tryout' : ''}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 rounded-2xl border bg-white p-6 min-w-0">
        {lessonLoading ? (
          <p className="text-gray-500 text-sm">Memuat lesson…</p>
        ) : !lessonDetail ? (
          <p className="text-gray-500 text-sm">Pilih lesson di sidebar.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{lessonDetail.title}</h2>
              <p className="text-xs text-gray-500 mt-1 uppercase">{lessonDetail.type}</p>
            </div>

            {lessonDetail.locked ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Lesson terkunci. Selesaikan lesson sebelumnya terlebih dahulu.
              </div>
            ) : null}

            {lessonDetail.liveClassUrl ? (
              <a
                href={lessonDetail.liveClassUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-sky-700"
              >
                Buka kelas live / meet
              </a>
            ) : null}

            {lessonDetail.pdfUrl ? (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-xs text-gray-600 flex justify-between items-center gap-2">
                  <span>Materi PDF</span>
                  <a
                    href={lessonDetail.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline"
                  >
                    Buka di tab baru
                  </a>
                </div>
                <iframe
                  title="PDF"
                  src={lessonDetail.pdfUrl}
                  className="w-full h-[min(70vh,520px)] bg-white"
                />
              </div>
            ) : null}

            {lessonDetail.videoUrl ? (
              <div className="rounded-xl overflow-hidden bg-black aspect-video">
                <video
                  key={lessonDetail.id}
                  className="w-full h-full"
                  src={lessonDetail.videoUrl}
                  controls
                  playsInline
                >
                  Browser tidak mendukung pemutaran video.
                </video>
              </div>
            ) : null}

            {lessonDetail.detailText ? (
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{lessonDetail.detailText}</div>
            ) : null}

            {lessonDetail.content && lessonDetail.content !== lessonDetail.detailText ? (
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{lessonDetail.content}</div>
            ) : null}

            {lessonDetail.type === 'quiz' && lessonDetail.tryoutSessionId ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 space-y-2">
                <p className="text-sm text-gray-800">Lesson ini terhubung ke sesi tryout. Kerjakan soal di halaman tryout.</p>
                <a
                  href={buildTryoutHref(lessonDetail.tryoutSessionId)}
                  className="inline-flex items-center justify-center rounded-xl bg-primary text-white px-4 py-2 text-sm font-medium hover:opacity-95"
                >
                  Buka / kerjakan tryout
                </a>
              </div>
            ) : null}

            {!lessonDetail.videoUrl &&
            !lessonDetail.pdfUrl &&
            !lessonDetail.detailText &&
            !lessonDetail.content &&
            !(lessonDetail.type === 'quiz' && lessonDetail.tryoutSessionId) ? (
              <p className="text-sm text-gray-500">Tidak ada konten untuk lesson ini.</p>
            ) : null}

            {(lessonDetail.type === 'assignment' || (lessonDetail.type === 'quiz' && !lessonDetail.tryoutSessionId)) &&
            (lessonDetail.content || lessonDetail.detailText) ? (
              <p className="text-xs text-gray-500">
                Setelah selesai, tandai lesson sebagai selesai untuk membuka lesson berikutnya.
              </p>
            ) : null}

            {completeError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {completeError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                disabled={lessonDetail.locked || lessonDetail.completed || completeLoading}
                onClick={onMarkComplete}
                className="inline-flex items-center justify-center rounded-xl bg-primary text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95"
              >
                {completeLoading ? 'Menyimpan…' : lessonDetail.completed ? 'Sudah selesai' : 'Tandai selesai'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

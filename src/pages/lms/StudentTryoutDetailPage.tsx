import { useEffect, useState } from 'react'
import {
  ApiError,
  getStudentTryoutDetail,
  getStudentTryoutStatus,
  getStudentTryoutsOpen,
  registerStudentTryout,
  startStudentTryoutWithFallback,
  type OpenTryoutItem,
} from '../../lib/api'
import { getTryoutCloseDateText, getTryoutRegistrationDeadlineText, getTryoutScheduleText } from '../../data/tryoutList'
import { isPastDeadline, isTryoutWindowOpen } from '../../utils/tryoutStudent'
import {
  clearTryoutExamSession,
  getTryoutExamSession,
  saveTryoutExamSession,
} from '../../lib/tryout-exam-session'
import { QuestionBody } from '../../components/lms/QuestionBody'

type TryoutActionState = 'unregistered' | 'registered' | 'attempted'

function deriveTryoutActionState(tryout: OpenTryoutItem | null): TryoutActionState {
  if (!tryout) return 'unregistered'
  if (tryout.hasAttempted) return 'attempted'
  if (tryout.isRegistered) return 'registered'
  return 'unregistered'
}

export default function StudentTryoutDetailPage({ tryoutId }: { tryoutId: string }) {
  const tryoutStatusFeatureFlag = import.meta.env.VITE_TRYOUT_STATUS_ENDPOINT_ENABLED as string | undefined
  const isTryoutStatusEndpointEnabled = tryoutStatusFeatureFlag ? tryoutStatusFeatureFlag === 'true' : true
  /** true = sembunyikan "Mulai ulang" (satu kali pengerjaan di UI; backend tetap harus menegakkan jika perlu). */
  const singleAttemptOnly = import.meta.env.VITE_TRYOUT_SINGLE_ATTEMPT_ONLY === 'true'
  const [tryout, setTryout] = useState<OpenTryoutItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)
  const [starting, setStarting] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionState, setActionState] = useState<TryoutActionState>('unregistered')
  const [canRetake, setCanRetake] = useState(false)
  const [retakeConfirmOpen, setRetakeConfirmOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getStudentTryoutDetail(tryoutId)
      .then((t) => {
        if (!cancelled) {
          setTryout(t)
        }
      })
      .catch(() => {
        return getStudentTryoutsOpen()
          .then((list) => {
            const t = list.find((x) => x.id === tryoutId) ?? null
            if (!cancelled) {
              if (t) setTryout(t)
              else {
                setTryout(null)
                setError('Tryout tidak ditemukan atau tidak tersedia untuk akun Anda.')
              }
            }
          })
          .catch((err) => {
            if (!cancelled) {
              setError(err instanceof ApiError ? err.message : 'Gagal memuat detail tryout.')
              setTryout(null)
            }
          })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tryoutId])

  useEffect(() => {
    if (!tryout) return
    const fallbackState = deriveTryoutActionState(tryout)
    setActionState(fallbackState)
    setCanRetake(Boolean(tryout.canRetake))

    if (!isTryoutStatusEndpointEnabled) return

    getStudentTryoutStatus(tryoutId)
      .then((status) => {
        if (!status) return
        setCanRetake(Boolean(status.canRetake))
        if (status.hasAttempted) {
          setActionState('attempted')
          return
        }
        if (status.isRegistered) {
          setActionState('registered')
          return
        }
        setActionState('unregistered')
      })
      .catch(() => {
        /* tetap pakai state dari detail */
      })
  }, [tryoutId, tryout, isTryoutStatusEndpointEnabled])

  useEffect(() => {
    if (!retakeConfirmOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRetakeConfirmOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [retakeConfirmOpen])

  if (loading) {
    return <div className="py-8 text-gray-500">Memuat detail tryout...</div>
  }
  if (error) {
    return (
      <div>
        <a href="#/student/tryout" className="text-sm text-primary hover:underline">
          ← Kembali ke daftar tryout
        </a>
        <div className="mt-4 p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>
      </div>
    )
  }

  if (!tryout) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Detail Tryout</h1>
        <p className="text-gray-500 mb-6">Tryout tidak ditemukan atau sudah tidak tersedia.</p>
        <a href="#/student/tryout" className="inline-flex px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50">
          Kembali ke daftar tryout
        </a>
      </div>
    )
  }

  const scheduleText = getTryoutScheduleText(tryout)
  const deadlineText = getTryoutRegistrationDeadlineText(tryout.registrationDeadlineAt)
  const closeDateText = getTryoutCloseDateText(tryout.closeAt)
  const windowOpen = isTryoutWindowOpen(tryout)
  const registrationClosed = isPastDeadline(tryout.registrationDeadlineAt)
  const canRegisterNow = windowOpen && !registrationClosed && actionState === 'unregistered'
  const canStartExamNow = windowOpen && actionState === 'registered'
  const showRetake =
    actionState === 'attempted' && canRetake && windowOpen && !singleAttemptOnly
  const leaderboardHref = `#/student/leaderboard/${tryout.id}`
  const cachedExam = getTryoutExamSession(tryout.id)
  const canResumeExam = canStartExamNow && Boolean(cachedExam?.attemptId)
  const showMulaiPertama = canStartExamNow && !cachedExam?.attemptId
  const examHref = `#/student/tryout/${encodeURIComponent(tryout.id)}/exam`
  const durationLabel =
    tryout.durationMinutes != null
      ? `${tryout.durationMinutes} menit`
      : 'Dari server saat ujian dibuka (timer mengikuti lembar API)'
  const questionCountLabel =
    tryout.questionCount != null
      ? `${tryout.questionCount} soal`
      : 'Dari server — terlihat di halaman pengerjaan setelah lembar dimuat'
  const hasNumericGradingHint =
    tryout.questionCount != null || tryout.pointsPerQuestion != null || tryout.maxScore != null
  const onRegisterTryout = async () => {
    setActionMessage(null)
    setRegistering(true)
    try {
      await registerStudentTryout(tryout.id)
      setActionState('registered')
      setActionMessage('Pendaftaran tryout berhasil. Anda bisa lanjut mulai ujian.')
    } catch (err) {
      setActionMessage(err instanceof ApiError ? err.message : 'Gagal mendaftarkan tryout.')
    } finally {
      setRegistering(false)
    }
  }

  const onStartExam = async () => {
    setActionMessage(null)
    setStarting(true)
    try {
      const res = await startStudentTryoutWithFallback(tryout.id)
      const examOk = typeof res.examUrl === 'string' && res.examUrl.trim()
      const attemptOk = res.attemptId != null && String(res.attemptId).trim() !== ''
      if (examOk || attemptOk) {
        saveTryoutExamSession(tryout.id, examOk ? res.examUrl!.trim() : undefined, res.attemptId, {
          expiresAt: typeof res.expiresAt === 'string' ? res.expiresAt : undefined,
          timeLeftSeconds: res.timeLeftSeconds,
          startedAt: typeof res.startedAt === 'string' ? res.startedAt : undefined,
        })
        window.location.hash = examHref
        return
      }
      setActionMessage(
        actionState === 'attempted'
          ? 'Tryout ulang berhasil dimulai. Silakan lanjut ke halaman ujian.'
          : 'Ujian berhasil dimulai. Silakan lanjut ke halaman ujian.',
      )
    } catch (err) {
      setActionMessage(err instanceof ApiError ? err.message : 'Gagal memulai ujian.')
    } finally {
      setStarting(false)
    }
  }

  const performRetakeExam = async () => {
    setRetakeConfirmOpen(false)
    setActionMessage(null)
    setStarting(true)
    try {
      clearTryoutExamSession()
      const res = await startStudentTryoutWithFallback(tryout.id)
      const examOk = typeof res.examUrl === 'string' && res.examUrl.trim()
      const attemptOk = res.attemptId != null && String(res.attemptId).trim() !== ''
      if (examOk || attemptOk) {
        saveTryoutExamSession(tryout.id, examOk ? res.examUrl!.trim() : undefined, res.attemptId, {
          expiresAt: typeof res.expiresAt === 'string' ? res.expiresAt : undefined,
          timeLeftSeconds: res.timeLeftSeconds,
          startedAt: typeof res.startedAt === 'string' ? res.startedAt : undefined,
        })
        window.location.hash = examHref
        return
      }
      setActionMessage('Tidak bisa memulai percobaan ulang. Coba lagi.')
    } catch (err) {
      setActionMessage(err instanceof ApiError ? err.message : 'Gagal memulai ujian ulang.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <a href="#/student/tryout" className="text-sm text-primary hover:underline">
          ← Kembali ke daftar tryout
        </a>
        <a
          href="#/student/tryout/history"
          className="text-sm text-gray-500 hover:text-primary hover:underline"
        >
          Riwayat tryout
        </a>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{tryout.title}</h1>
      <p className="text-gray-500 mb-8">
        Daftar tryout dulu untuk bisa memulai ujian. Setelah terdaftar, Anda bisa mulai kapan saja selama periode tryout belum berakhir. Leaderboard dapat dibuka kapan saja untuk melihat peringkat peserta, meskipun Anda belum mengerjakan.
      </p>

      {!windowOpen && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Periode tryout ini sudah berakhir{closeDateText ? ` (tutup: ${closeDateText})` : ''}. Anda tidak bisa mendaftar atau memulai ujian baru. Leaderboard tetap bisa dilihat.
        </div>
      )}
      {windowOpen && registrationClosed && actionState === 'unregistered' && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Batas pendaftaran untuk tryout ini sudah lewat{deadlineText ? ` (${deadlineText})` : ''}.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 rounded-2xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Informasi Pelaksanaan</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>Jadwal: <span className="font-medium text-gray-900">{scheduleText}</span></li>
            {deadlineText && <li>Batas daftar: <span className="font-medium text-gray-900">{deadlineText}</span></li>}
            {closeDateText && <li>Tutup tryout: <span className="font-medium text-gray-900">{closeDateText}</span></li>}
            <li>
              Durasi: <span className="font-medium text-gray-900">{durationLabel}</span>
            </li>
            <li>
              Jumlah soal: <span className="font-medium text-gray-900">{questionCountLabel}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Aksi Peserta</h2>
          <div className="space-y-3">
            {actionMessage && (
              <div className={`p-3 rounded-lg text-sm ${actionMessage.includes('berhasil') ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>
                {actionMessage}
              </div>
            )}
            <a
              href={leaderboardHref}
              className="block w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-center text-gray-800 hover:bg-gray-50"
            >
              Lihat Leaderboard
            </a>
            <p className="text-xs text-gray-500">
              Tersedia untuk semua peserta: lihat peringkat dan siapa yang sudah mengerjakan, tanpa harus menyelesaikan ujian dulu.
            </p>
            {actionState === 'unregistered' && canRegisterNow && (
              <button
                type="button"
                className="w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
                onClick={onRegisterTryout}
                disabled={registering || starting}
              >
                {registering ? 'Mendaftarkan...' : 'Daftar Tryout'}
              </button>
            )}
            {actionState === 'unregistered' && !canRegisterNow && (
              <p className="text-sm text-gray-600">
                {!windowOpen
                  ? 'Periode tryout sudah berakhir — tidak bisa mendaftar.'
                  : registrationClosed
                    ? 'Pendaftaran sudah ditutup.'
                    : 'Tidak dapat mendaftar saat ini.'}
              </p>
            )}
            {actionState === 'registered' && showMulaiPertama && (
              <button
                type="button"
                className="w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
                onClick={onStartExam}
                disabled={starting || registering}
              >
                {starting ? 'Memulai...' : 'Mulai Ujian'}
              </button>
            )}
            {actionState === 'registered' && canResumeExam && (
              <>
                <a
                  href={examHref}
                  className="block w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold text-center hover:bg-primary-hover"
                >
                  Lanjutkan ujian
                </a>
                <p className="text-xs text-gray-500">
                  Sesi sudah dimulai (hanya sekali). Timer dan jawaban dilanjutkan dari cache perangkat ini.
                </p>
              </>
            )}
            {actionState === 'registered' && !canStartExamNow && (
              <p className="text-sm text-gray-600">
                Periode tryout sudah berakhir — tidak bisa memulai ujian.
              </p>
            )}
            {actionState === 'attempted' && windowOpen && singleAttemptOnly && (
              <p className="text-sm text-gray-600">
                Anda sudah mengerjakan tryout ini. Untuk sesi ini, percobaan ulang tidak ditampilkan (satu kali
                pengerjaan).
              </p>
            )}
            {showRetake && (
              <button
                type="button"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                onClick={() => setRetakeConfirmOpen(true)}
                disabled={starting || registering}
              >
                {starting ? 'Memulai Ulang...' : 'Mulai Ulang'}
              </button>
            )}
          </div>
        </div>
      </div>

      {retakeConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="presentation"
          onClick={() => !starting && setRetakeConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="retake-dialog-title"
            className="max-w-md w-full rounded-2xl border bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="retake-dialog-title" className="text-lg font-semibold text-gray-900">
              Mulai ulang tryout?
            </h2>
            <ul className="mt-3 list-disc list-inside text-sm text-gray-600 space-y-2">
              <li>Ujian dimulai dari awal dengan percobaan baru (attempt baru di server).</li>
              <li>Timer dan jawaban tersimpan di perangkat ini untuk sesi lama akan dihapus.</li>
              <li>
                Peringkat di leaderboard biasanya mengikuti hasil terbaru — skor atau posisi Anda sebelumnya bisa
                digantikan oleh hasil pengulangan ini.
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setRetakeConfirmOpen(false)}
                disabled={starting}
              >
                Batal
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
                onClick={() => void performRetakeExam()}
                disabled={starting || registering}
              >
                {starting ? 'Memproses...' : 'Ya, mulai ulang'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Aturan Penilaian Singkat</h2>
        {tryout.gradingNotes ? (
          <div className="text-sm text-gray-600">
            <QuestionBody html={tryout.gradingNotes} />
          </div>
        ) : (
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
            {hasNumericGradingHint ? (
              <li>
                {tryout.questionCount != null ? (
                  <span className="font-medium text-gray-800">{tryout.questionCount} soal</span>
                ) : null}
                {tryout.questionCount != null && (tryout.pointsPerQuestion != null || tryout.maxScore != null)
                  ? ' · '
                  : null}
                {tryout.pointsPerQuestion != null
                  ? `tiap jawaban benar hingga ${tryout.pointsPerQuestion} poin`
                  : null}
                {tryout.pointsPerQuestion != null && tryout.maxScore != null ? ' · ' : null}
                {tryout.maxScore != null ? `nilai maksimal ${tryout.maxScore}` : null}
                .
              </li>
            ) : (
              <li>
                Rincian bobot mengikuti pengaturan tryout di server. Daftar soal, teks per nomor, dan timer aktual
                dimuat dari API ketika Anda membuka halaman ujian.
              </li>
            )}
            <li>
              Jawaban salah atau kosong biasanya tidak mengurangi nilai; hanya jawaban benar yang menambah poin
              (sesuai kebijakan server).
            </li>
          </ul>
        )}
      </div>
    </div>
  )
}

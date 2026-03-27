import { useEffect, useState } from 'react'
import {
  ApiError,
  getStudentTryoutStatus,
  getOpenTryouts,
  registerStudentTryout,
  startStudentTryout,
  type OpenTryoutItem,
} from '../../lib/api'
import { getTryoutCloseDateText, getTryoutRegistrationDeadlineText, getTryoutScheduleText } from '../../data/tryoutList'
import { isPastDeadline, isTryoutWindowOpen } from '../../utils/tryoutStudent'

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
  const [tryouts, setTryouts] = useState<OpenTryoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)
  const [starting, setStarting] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionState, setActionState] = useState<TryoutActionState>('unregistered')
  const [canRetake, setCanRetake] = useState(false)

  useEffect(() => {
    getOpenTryouts()
      .then((list) => {
        setTryouts(list)
        setError(null)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat detail tryout.')
        setTryouts([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const tryout = tryouts.find((t) => t.id === tryoutId) ?? null
    const fallbackState = deriveTryoutActionState(tryout)
    setActionState(fallbackState)
    setCanRetake(Boolean(tryout?.canRetake))

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
        /* tetap pakai state dari daftar open tryouts */
      })
  }, [tryoutId, tryouts, isTryoutStatusEndpointEnabled])

  if (loading) {
    return <div className="py-8 text-gray-500">Memuat detail tryout...</div>
  }
  if (error) {
    return (
      <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">
        {error}
      </div>
    )
  }

  const tryout = tryouts.find((t) => t.id === tryoutId) ?? null

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
  const showRetake = actionState === 'attempted' && canRetake && windowOpen
  const leaderboardHref = `#/student/leaderboard/${tryout.id}`
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
      const res = await startStudentTryout(tryout.id)
      if (typeof res.examUrl === 'string' && res.examUrl.trim()) {
        window.location.href = res.examUrl
        return
      }
      setActionMessage(
        actionState === 'attempted'
          ? 'Tryout ulang berhasil dimulai. Silakan lanjut ke halaman ujian.'
          : 'Ujian berhasil dimulai. Silakan lanjut ke halaman ujian.'
      )
    } catch (err) {
      setActionMessage(err instanceof ApiError ? err.message : 'Gagal memulai ujian.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <a href="#/student/tryout" className="text-sm text-primary hover:underline">
          ← Kembali ke daftar tryout
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
            <li>Durasi: <span className="font-medium text-gray-900">60 menit</span></li>
            <li>Jumlah soal: <span className="font-medium text-gray-900">20 soal</span></li>
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
            {actionState === 'registered' && canStartExamNow && (
              <button
                type="button"
                className="w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
                onClick={onStartExam}
                disabled={starting || registering}
              >
                {starting ? 'Memulai...' : 'Mulai Ujian'}
              </button>
            )}
            {actionState === 'registered' && !canStartExamNow && (
              <p className="text-sm text-gray-600">
                Periode tryout sudah berakhir — tidak bisa memulai ujian.
              </p>
            )}
            {showRetake && (
              <button
                type="button"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                onClick={onStartExam}
                disabled={starting || registering}
              >
                {starting ? 'Memulai Ulang...' : 'Mulai Ulang'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Aturan Penilaian Singkat</h2>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
          <li>Pilihan ganda / benar-salah: 1 poin untuk jawaban benar.</li>
          <li>Isian singkat: 2 poin untuk jawaban benar.</li>
          <li>Jawaban salah atau kosong tidak mengurangi nilai.</li>
        </ul>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  ApiError,
  getStudentTryoutStatus,
  getOpenTryouts,
  registerStudentTryout,
  startStudentTryout,
  type OpenTryoutItem,
} from '../../lib/api'
import { isLeaderboardVisible } from '../../utils/tryoutDates'
import { getTryoutRegistrationDeadlineText, getTryoutScheduleText } from '../../data/tryoutList'

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

    // Endpoint status bersifat opsional.
    // Default: OFF agar tidak spam 404 jika backend belum menyediakan endpoint ini.
    if (!isTryoutStatusEndpointEnabled) return

    getStudentTryoutStatus(tryoutId)
      .then((status) => {
        if (!status) return
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
        // Silently keep fallback state from open tryouts data.
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
        Halaman ini adalah detail tryout khusus peserta yang sudah login. Anda bisa melihat jadwal, aturan, dan melanjutkan proses pendaftaran tryout dari dashboard.
      </p>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 rounded-2xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Informasi Pelaksanaan</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>Jadwal: <span className="font-medium text-gray-900">{scheduleText}</span></li>
            {deadlineText && <li>Batas daftar: <span className="font-medium text-gray-900">{deadlineText}</span></li>}
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
            {actionState === 'unregistered' && (
              <button
                type="button"
                className="w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
                onClick={onRegisterTryout}
                disabled={registering || starting}
              >
                {registering ? 'Mendaftarkan...' : 'Daftar Tryout'}
              </button>
            )}
            {actionState === 'registered' && (
              <button
                type="button"
                className="w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
                onClick={onStartExam}
                disabled={starting || registering}
              >
                {starting ? 'Memulai...' : 'Mulai Ujian'}
              </button>
            )}
            {actionState === 'attempted' && (
              <button
                type="button"
                className="w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
                onClick={onStartExam}
                disabled={starting || registering}
              >
                {starting ? 'Memulai Ulang...' : 'Mulai Ulang'}
              </button>
            )}
            {isLeaderboardVisible() && (
              <a href={leaderboardHref} className="block w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-center hover:bg-gray-50">
                Lihat Leaderboard
              </a>
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

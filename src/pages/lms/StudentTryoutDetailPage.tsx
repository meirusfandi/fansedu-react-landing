import { isLeaderboardVisible } from '../../utils/tryoutDates'
import { getOpenTryouts, getTryoutRegistrationDeadlineText, getTryoutScheduleText } from '../../data/tryoutList'

export default function StudentTryoutDetailPage({ tryoutId }: { tryoutId: string }) {
  const tryouts = getOpenTryouts()
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
  const leaderboardHref = `#/leaderboard/${tryout.id}`

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
            <button
              type="button"
              className="w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
              disabled
              title="Aktifkan saat endpoint pendaftaran tryout sudah tersedia"
            >
              Daftar Tryout (coming soon)
            </button>
            <button
              type="button"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 disabled:opacity-60"
              disabled
              title="Aktifkan saat endpoint mulai ujian sudah tersedia"
            >
              Mulai Ujian (coming soon)
            </button>
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

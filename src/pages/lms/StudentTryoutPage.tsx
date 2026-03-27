import { useEffect, useState } from 'react'
import { ApiError, getOpenTryouts, type OpenTryoutItem } from '../../lib/api'
import { getTryoutScheduleText } from '../../data/tryoutList'
import { filterStudentVisibleTryouts } from '../../utils/tryoutStudent'

export default function StudentTryoutPage() {
  const [tryouts, setTryouts] = useState<OpenTryoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getOpenTryouts()
      .then((list) => {
        setTryouts(filterStudentVisibleTryouts(list))
        setError(null)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat daftar tryout.')
        setTryouts([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Tryout</h1>
      <p className="text-gray-500 mb-8">
        Tryout yang tampil adalah yang sedang dibuka dan belum melewati tanggal tutup. Buka detail untuk mendaftar; setelah terdaftar Anda bisa mulai ujian kapan saja selama periode masih berjalan. Setelah mengerjakan, Anda dapat melihat leaderboard.
      </p>

      {loading ? (
        <div className="border rounded-2xl p-8 bg-white text-center text-gray-500">
          Memuat daftar tryout...
        </div>
      ) : error ? (
        <div className="border rounded-2xl p-8 bg-white text-center">
          <p className="text-sm text-amber-700 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50"
          >
            Coba lagi
          </button>
        </div>
      ) : tryouts.length === 0 ? (
        <div className="border rounded-2xl p-8 bg-white text-center text-gray-500">
          Belum ada tryout yang terbuka. Cek kembali nanti.
        </div>
      ) : (
        <div className="space-y-4">
          {tryouts.map((t) => (
            <a
              key={t.id}
              href={`#/student/tryout/${t.id}`}
              className="block border rounded-2xl p-6 bg-white hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-semibold text-gray-900">{t.shortTitle || t.title}</h2>
                    {t.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        {t.badge}
                      </span>
                    )}
                    {t.hasAttempted ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                        Sudah dikerjakan
                      </span>
                    ) : t.isRegistered ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                        Sudah daftar
                      </span>
                    ) : null}
                  </div>
                  {t.description && (
                    <p className="text-sm text-gray-600 mb-1 line-clamp-2">{t.description}</p>
                  )}
                  <p className="text-sm text-gray-500">{getTryoutScheduleText(t)}</p>
                </div>
                <span className="shrink-0 text-primary font-medium text-sm">Lihat detail →</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

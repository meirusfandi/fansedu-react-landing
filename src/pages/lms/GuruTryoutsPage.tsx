import { useEffect, useState } from 'react'
import { ApiError, getOpenTryouts, type OpenTryoutItem } from '../../lib/api'
import { getTryoutScheduleText } from '../../data/tryoutList'

export default function GuruTryoutsPage() {
  const [tryouts, setTryouts] = useState<OpenTryoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getOpenTryouts()
      .then((list) => {
        setTryouts(list)
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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Analisis Tryout</h1>
      <p className="text-gray-500 mb-8">
        Pilih tryout untuk melihat analisis per soal, daftar peserta, dan analisis AI per siswa.
      </p>

      {loading ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-gray-500">
          Memuat daftar tryout...
        </div>
      ) : error ? (
        <div className="rounded-2xl border bg-white p-12 text-center">
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
        <div className="rounded-2xl border bg-white p-12 text-center text-gray-500">
          Belum ada tryout yang terbuka.
        </div>
      ) : (
        <div className="space-y-4">
          {tryouts.map((t) => (
            <div
              key={t.id}
              className="block rounded-2xl border bg-white p-6 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-semibold text-gray-900">{t.shortTitle || t.title}</h2>
                    {t.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-sm text-gray-600 mb-1 line-clamp-2">{t.description}</p>
                  )}
                  <p className="text-sm text-gray-500">{getTryoutScheduleText(t)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`#/guru/tryouts/${encodeURIComponent(t.id)}`}
                  className="inline-flex px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover"
                >
                  Lihat Analisis
                </a>
                <a
                  href={`#/guru/leaderboard/${encodeURIComponent(t.id)}`}
                  className="inline-flex px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Leaderboard Internal
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, getRegisterMasterData, type OpenTryoutItem, type RegisterLevelOption, type TryoutFilterParams } from '../../lib/api'
import { getTryoutScheduleText } from '../../data/tryoutList'
import { TryoutListSkeletonLms } from '../../components/tryout/TryoutListSkeleton'
import { fetchVisibleTryoutsForViewer } from '../../utils/fetchVisibleTryouts'

export default function StudentTryoutPage() {
  const [tryouts, setTryouts] = useState<OpenTryoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // --- Filter state ---
  const [levels, setLevels] = useState<RegisterLevelOption[]>([])
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')

  const retryLoad = useCallback(() => setReloadKey((k) => k + 1), [])

  // Load master data for filter dropdowns
  useEffect(() => {
    getRegisterMasterData()
      .then((res) => setLevels(res.levels))
      .catch(() => {
        /* master data opsional — filter tetap bisa diketik manual */
      })
  }, [])

  // Subject options berdasarkan level terpilih
  const subjectOptions = useMemo(() => {
    if (!selectedLevel) {
      // Kumpulkan semua subject unik dari semua level
      const map = new Map<string, string>()
      for (const lv of levels) {
        for (const s of lv.subjects) {
          if (!map.has(s.name)) map.set(s.name, s.name)
        }
      }
      return Array.from(map.values())
    }
    const lv = levels.find((l) => l.slug === selectedLevel || l.name === selectedLevel)
    return lv ? lv.subjects.map((s) => s.name) : []
  }, [levels, selectedLevel])

  // Build filter params
  const filterParams = useMemo((): TryoutFilterParams | undefined => {
    const f: TryoutFilterParams = {}
    if (selectedSubject.trim()) {
      // Prefer slug from master data; fall back to the raw name string
      const subjectSlug = levels
        .flatMap((lv) => lv.subjects)
        .find((s) => s.name === selectedSubject.trim())
        ?.slug
      f.subject = subjectSlug ?? selectedSubject.trim()
    }
    if (selectedLevel.trim()) f.level = selectedLevel.trim()
    return f.subject || f.level ? f : undefined
  }, [selectedSubject, selectedLevel, levels])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchVisibleTryoutsForViewer({ preferStudentOpen: true, filter: filterParams })
      .then((list) => {
        if (!cancelled) {
          setTryouts(list)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Gagal memuat daftar tryout.')
          setTryouts([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey, filterParams])

  // Reset subject saat level berubah (jika subject tidak ada di level baru)
  useEffect(() => {
    if (selectedSubject && subjectOptions.length > 0 && !subjectOptions.includes(selectedSubject)) {
      setSelectedSubject('')
    }
  }, [selectedLevel, subjectOptions, selectedSubject])

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tryout</h1>
          <p className="text-gray-500">
            Tryout yang terbuka untuk akun Anda, difilter berdasarkan bidang dan kelas.
          </p>
        </div>
        <a
          href="#/student/tryout/history"
          className="shrink-0 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Riwayat tryout
        </a>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-level" className="text-xs font-medium text-gray-500">
            Kelas / Jenjang
          </label>
          <select
            id="filter-level"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 min-w-[140px]"
          >
            <option value="">Semua jenjang</option>
            {levels.map((lv) => (
              <option key={lv.id} value={lv.slug}>
                {lv.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-subject" className="text-xs font-medium text-gray-500">
            Bidang / Mata Pelajaran
          </label>
          <select
            id="filter-subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 min-w-[160px]"
          >
            <option value="">Semua bidang</option>
            {subjectOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {(selectedLevel || selectedSubject) && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSelectedLevel('')
                setSelectedSubject('')
              }}
              className="px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-primary hover:bg-gray-50 transition-colors"
            >
              Reset filter
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <TryoutListSkeletonLms rows={4} />
      ) : error ? (
        <div className="border rounded-2xl p-8 bg-white text-center">
          <p className="text-sm text-amber-700 mb-4">{error}</p>
          <button
            type="button"
            onClick={retryLoad}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50"
          >
            Coba lagi
          </button>
        </div>
      ) : tryouts.length === 0 ? (
        <div className="border rounded-2xl p-8 bg-white text-center text-gray-500">
          {filterParams ? (
            'Tidak ada tryout yang cocok dengan filter. Coba ubah filter atau reset.'
          ) : (
            <>
              <p>Belum ada tryout yang terbuka untuk akun Anda.</p>
              <p className="text-sm mt-2">
                Pastikan profil akademik (jenjang &amp; bidang studi) sudah diisi lengkap di{' '}
                <a href="#/student/profile" className="text-primary hover:underline font-medium">halaman profil</a>.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {tryouts.map((t) => (
            <a
              key={t.id}
              href={`#/student/tryout/${encodeURIComponent(t.id)}`}
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
                  {(t.durationMinutes != null || t.questionCount != null) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {[t.durationMinutes != null ? `${t.durationMinutes} menit` : null, t.questionCount != null ? `${t.questionCount} soal` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
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

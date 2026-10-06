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

  useEffect(() => {
    getRegisterMasterData()
      .then((res) => setLevels(res.levels))
      .catch(() => {})
  }, [])

  const subjectOptions = useMemo(() => {
    if (!selectedLevel) {
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

  const filterParams = useMemo((): TryoutFilterParams | undefined => {
    const f: TryoutFilterParams = {}
    if (selectedSubject.trim()) {
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

  useEffect(() => {
    if (selectedSubject && subjectOptions.length > 0 && !subjectOptions.includes(selectedSubject)) {
      setSelectedSubject('')
    }
  }, [selectedLevel, subjectOptions, selectedSubject])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Simulasi Tryout OSN</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200/60 uppercase">
              Gratis &amp; Resmi
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Ikuti simulasi olimpiade sains berskala nasional, cek rangking, dan evaluasi hasil latihanmu.
          </p>
        </div>
        <a
          href="#/student/tryout/history"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/30 transition-all shadow-xs self-start sm:self-auto"
        >
          <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Riwayat Tryout Saya</span>
        </a>
      </div>

      {/* Filter Bar (TeachSync Style) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 flex flex-wrap items-center gap-3 shadow-xs">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-level" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Jenjang / Kelas
          </label>
          <select
            id="filter-level"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 min-w-[150px]"
          >
            <option value="">Semua Jenjang</option>
            {levels.map((lv) => (
              <option key={lv.id} value={lv.slug}>
                {lv.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-subject" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Bidang Kompetisi
          </label>
          <select
            id="filter-subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 min-w-[170px]"
          >
            <option value="">Semua Bidang</option>
            {subjectOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {(selectedLevel || selectedSubject) && (
          <div className="flex items-end self-end sm:mb-0.5">
            <button
              type="button"
              onClick={() => {
                setSelectedLevel('')
                setSelectedSubject('')
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors"
            >
              Reset Filter ✕
            </button>
          </div>
        )}
      </div>

      {/* Konten Tryout */}
      {loading ? (
        <TryoutListSkeletonLms rows={4} />
      ) : error ? (
        <div className="rounded-3xl border border-amber-200 p-8 bg-amber-50 text-center shadow-xs">
          <p className="text-sm font-semibold text-amber-900 mb-3">{error}</p>
          <button
            type="button"
            onClick={retryLoad}
            className="px-5 py-2 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-900 hover:bg-amber-100/50 shadow-xs"
          >
            Coba Muat Ulang
          </button>
        </div>
      ) : tryouts.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/90 p-12 bg-white text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4 text-2xl">
            🎯
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Belum Ada Tryout Terbuka</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-4">
            {filterParams
              ? 'Tidak ada tryout yang cocok dengan filter yang dipilih. Silakan reset filter.'
              : 'Pastikan data jenjang dan bidang studi di profil sudah sesuai dengan jadwal kompetisi yang dibuka.'}
          </p>
          <a
            href="#/student/profile"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 shadow-xs"
          >
            Cek Profil Akademik
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {tryouts.map((t) => (
            <a
              key={t.id}
              href={`#/student/tryout/${encodeURIComponent(t.id)}`}
              className="group block rounded-2xl border border-slate-200/90 p-5 sm:p-6 bg-white hover:border-teal-300 hover:shadow-md transition-all shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors text-base sm:text-lg">
                      {t.shortTitle || t.title}
                    </h2>
                    {t.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                        {t.badge}
                      </span>
                    )}
                    {t.hasAttempted ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                        Sudah Dikerjakan ✓
                      </span>
                    ) : t.isRegistered ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                        Sudah Terdaftar
                      </span>
                    ) : null}
                  </div>

                  {t.description && (
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium pt-1">
                    <span className="flex items-center gap-1.5 text-teal-700">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {getTryoutScheduleText(t)}
                    </span>
                    {(t.durationMinutes != null || t.questionCount != null) && (
                      <span className="text-slate-400">
                        · {[t.durationMinutes != null ? `${t.durationMinutes} Menit` : null, t.questionCount != null ? `${t.questionCount} Soal` : null].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-50 group-hover:bg-teal-600 text-teal-700 group-hover:text-white font-semibold text-xs transition-all shadow-xs">
                    <span>{t.hasAttempted ? 'Lihat Hasil / Pembahasan' : 'Ikuti Ujian'}</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

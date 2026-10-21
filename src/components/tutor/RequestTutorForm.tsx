import { useState } from 'react'
import {
  submitTutorRequest,
  buildTutorRequestWhatsAppUrl,
  type TutorRequestPayload,
} from '../../lib/api'

interface RequestTutorFormProps {
  initialStudentName?: string
  initialEmail?: string
  initialPhone?: string
  onSuccess?: () => void
  isCompact?: boolean
}

export function RequestTutorForm({
  initialStudentName = '',
  initialEmail = '',
  initialPhone = '',
  onSuccess,
  isCompact = false,
}: RequestTutorFormProps) {
  const [studentName, setStudentName] = useState(initialStudentName)
  const [phone, setPhone] = useState(initialPhone)
  const [email, setEmail] = useState(initialEmail)
  const [level, setLevel] = useState('SMA')
  const [serviceType, setServiceType] = useState<'osn' | 'tka' | 'private' | 'coding'>('tka')
  const [learningMode, setLearningMode] = useState<'online' | 'offline'>('online')
  const [city, setCity] = useState('')
  const [preferredSchedule, setPreferredSchedule] = useState('')
  const [targetGoals, setTargetGoals] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Matematika', 'TKA Saintek'])

  const [loading, setLoading] = useState(false)
  const [submittedPayload, setSubmittedPayload] = useState<TutorRequestPayload | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const SUBJECT_SUGGESTIONS: Record<string, string[]> = {
    osn: ['Informatika / Pemrograman C++', 'Matematika SMP', 'Matematika SD', 'Matematika SMA', 'Fisika', 'IPA SD/SMP'],
    tka: ['TKA Saintek (Matematika & IPA)', 'TKA Soshum', 'Persiapan Masuk SMA Taruna Nusantara', 'Persiapan SMA Pradita Dirgantara', 'Persiapan MAN IC', 'UTBK-SNBT'],
    private: ['Matematika Kurikulum Merdeka', 'Fisika', 'Kimia', 'Biologi', 'Bahasa Inggris', 'Persiapan Ujian Sekolah'],
    coding: ['Dasar Pemrograman (Python)', 'C++ Olimpiade', 'Web Development Dasar', 'Logika Berpikir Komputasional'],
  }

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    )
  }

  const handleAddCustomSubject = () => {
    const trimmed = customSubject.trim()
    if (trimmed && !selectedSubjects.includes(trimmed)) {
      setSelectedSubjects((prev) => [...prev, trimmed])
      setCustomSubject('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!studentName.trim()) {
      setErrorMsg('Mohon isi nama lengkap siswa.')
      return
    }

    if (!phone.trim()) {
      setErrorMsg('Mohon isi nomor WhatsApp yang aktif.')
      return
    }

    const finalSubjects = [...selectedSubjects]
    if (customSubject.trim() && !finalSubjects.includes(customSubject.trim())) {
      finalSubjects.push(customSubject.trim())
    }

    if (finalSubjects.length === 0) {
      setErrorMsg('Pilih minimal satu mata pelajaran atau materi yang ingin dipelajari.')
      return
    }

    const payload: TutorRequestPayload = {
      student_name: studentName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      level,
      service_type: serviceType,
      subjects: finalSubjects,
      learning_mode: learningMode,
      city: city.trim() || undefined,
      preferred_schedule: preferredSchedule.trim() || undefined,
      target_goals: targetGoals.trim() || undefined,
      source: 'fansedu_web',
    }

    setLoading(true)
    try {
      await submitTutorRequest(payload)
      setSubmittedPayload(payload)
      if (onSuccess) onSuccess()
    } catch {
      setSubmittedPayload(payload)
    } finally {
      setLoading(false)
    }
  }

  if (submittedPayload) {
    const waUrl = buildTutorRequestWhatsAppUrl(submittedPayload)
    return (
      <div className="rounded-3xl border border-teal-200 bg-white p-6 sm:p-8 text-center shadow-md animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-4 text-3xl">
          ✓
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
          Permintaan Pengajar Berhasil Dikirim!
        </h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
          Terima kasih, <strong className="text-slate-900">{submittedPayload.student_name}</strong>. Tim FansEdu bersama jaringan pengajar TeachSync akan segera mencocokkan guru terbaik untukmu.
        </p>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left max-w-md mx-auto mb-6 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Layanan:</span>
            <span className="font-semibold text-slate-800 uppercase">{submittedPayload.service_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Jenjang:</span>
            <span className="font-semibold text-slate-800">{submittedPayload.level}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Mata Pelajaran:</span>
            <span className="font-semibold text-teal-700">{submittedPayload.subjects.join(', ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Mode Belajar:</span>
            <span className="font-semibold text-slate-800">
              {submittedPayload.learning_mode === 'offline' ? 'Guru Datang ke Rumah (Offline)' : 'Online Interaktif'}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all"
          >
            <span>Kirim &amp; Konfirmasi via WhatsApp</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
            </svg>
          </a>
          <button
            type="button"
            onClick={() => setSubmittedPayload(null)}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors"
          >
            Buat Permintaan Baru
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm font-semibold text-rose-800">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* 1. Pilih Kategori Layanan */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          1. Pilih Jenis Layanan
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: 'tka',
              title: 'Bimbingan TKA',
              desc: 'Masuk PTN & SMA Unggulan',
              icon: '🎯',
            },
            {
              id: 'osn',
              title: 'Pelatihan OSN',
              desc: 'Informatika & Matematika',
              icon: '🏆',
            },
            {
              id: 'private',
              title: 'Kelas Privat 1-on-1',
              desc: 'Pelajaran Sekolah & Ujian',
              icon: '📚',
            },
            {
              id: 'coding',
              title: 'Privat Coding',
              desc: 'Algoritma, C++, Python',
              icon: '💻',
            },
          ].map((item) => {
            const active = serviceType === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setServiceType(item.id as typeof serviceType)
                  setSelectedSubjects(SUBJECT_SUGGESTIONS[item.id].slice(0, 2))
                }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  active
                    ? 'border-teal-500 bg-teal-50/80 ring-2 ring-teal-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="text-2xl mb-1 block" role="img" aria-label={item.title}>
                  {item.icon}
                </span>
                <p className={`font-bold text-sm ${active ? 'text-teal-900' : 'text-slate-900'}`}>
                  {item.title}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Jenjang & Format Belajar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            2. Jenjang Siswa
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['SD', 'SMP', 'SMA', 'UTBK/Alumni'].map((lvl) => {
              const active = level === lvl
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    active
                      ? 'border-teal-500 bg-teal-600 text-white shadow-xs'
                      : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                  }`}
                >
                  {lvl}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            3. Format Belajar
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'online', label: 'Online Interaktif', sub: 'Zoom / GMeet' },
              { id: 'offline', label: 'Guru ke Rumah', sub: 'Area Tertentu' },
            ].map((mode) => {
              const active = learningMode === mode.id
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setLearningMode(mode.id as typeof learningMode)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    active
                      ? 'border-teal-500 bg-teal-50/80 ring-2 ring-teal-500/20'
                      : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className={`text-xs font-bold ${active ? 'text-teal-900' : 'text-slate-800'}`}>
                    {mode.label}
                  </p>
                  <p className="text-[10px] text-slate-400">{mode.sub}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. Mata Pelajaran / Materi yang Diinginkan */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          4. Mata Pelajaran / Materi Pembelajaran
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {(SUBJECT_SUGGESTIONS[serviceType] || []).map((sub) => {
            const active = selectedSubjects.includes(sub)
            return (
              <button
                key={sub}
                type="button"
                onClick={() => toggleSubject(sub)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  active
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-300'
                }`}
              >
                {active ? '✓ ' : '+ '} {sub}
              </button>
            )
          })}
        </div>

        {/* Input Custom Subject */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddCustomSubject()
              }
            }}
            placeholder="Tambah materi lain (mis. Kalkulus, Geometri Olimpiade, dll)..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
          />
          <button
            type="button"
            onClick={handleAddCustomSubject}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
          >
            Tambah
          </button>
        </div>
      </div>

      {/* 5. Domisili & Preferensi Waktu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            5. Kota / Domisili
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Misal: Yogyakarta, Jakarta Selatan, Surabaya"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            6. Preferensi Waktu &amp; Hari
          </label>
          <input
            type="text"
            value={preferredSchedule}
            onChange={(e) => setPreferredSchedule(e.target.value)}
            placeholder="Misal: Senin &amp; Kamis sore (16:00 WIB), atau Weekend"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
      </div>

      {/* 6. Target Belajar Siswa */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          7. Target &amp; Kebutuhan Khusus
        </label>
        <textarea
          rows={2}
          value={targetGoals}
          onChange={(e) => setTargetGoals(e.target.value)}
          placeholder="Ceritakan targetmu, misal: 'Ingin persiapan seleksi SMA Pradita Dirgantara', 'Perlu guru privat C++ untuk persiapan OSN-K 2027', atau 'Fokus pemantapan nilai rapor semester 1'..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      {/* 7. Kontak Siswa / Orang Tua */}
      <div className="pt-2 border-t border-slate-100">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          8. Informasi Kontak Pemohon
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Lengkap Siswa *</label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Nama lengkap"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">No. WhatsApp Aktif *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0812xxxxxxx"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email (Opsional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-3">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm sm:text-base shadow-md transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Memproses Permintaan...</span>
          ) : (
            <>
              <span>Cari Pengajar Sekarang</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
        <p className="text-[11px] text-center text-slate-400 mt-2.5">
          🔒 Terhubung langsung dengan sistem tutor dispatch TeachSync. Data kamu aman dan tidak disebarluaskan.
        </p>
      </div>
    </form>
  )
}

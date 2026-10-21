import { useAuthStore } from '../../store/auth'
import { RequestTutorForm } from '../../components/tutor/RequestTutorForm'

export default function StudentRequestTutorPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-xs text-teal-100 border border-white/20 mb-3">
            <span>Powered by TeachSync Network</span>
            <span>⭐</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            Request Pengajar &amp; Kelas Privat
          </h1>
          <p className="text-xs sm:text-sm text-teal-100/90 max-w-2xl leading-relaxed">
            Butuh bimbingan 1-on-1 untuk persiapan intensif OSN, pemantapan TKA (Tes Kemampuan Akademik), atau pendampingan materi sekolah? Ajukan kriteria guru impianmu, dan kami akan mencocokkan mentor terbaik untukmu.
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold mb-2.5">
            🎯
          </div>
          <h3 className="text-xs font-bold text-slate-900 mb-1">Mentor Terverifikasi</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Alumni juara OSN, lulusan PTN terbaik, dan pengajar berpengalaman dari TeachSync.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-2.5">
            🗓️
          </div>
          <h3 className="text-xs font-bold text-slate-900 mb-1">Jadwal Fleksibel</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Waktu belajar disesuaikan dengan aktivitasmu, baik online (Zoom) maupun offline ke rumah.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold mb-2.5">
            💎
          </div>
          <h3 className="text-xs font-bold text-slate-900 mb-1">Kurikulum Personal</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Materi difokuskan langsung pada kelemahan dan target kelulusan impianmu.
          </p>
        </div>
      </div>

      {/* Formulir Request Pengajar */}
      <RequestTutorForm
        initialStudentName={user?.name || ''}
        initialEmail={user?.email || ''}
      />
    </div>
  )
}

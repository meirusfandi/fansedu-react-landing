import { useEffect } from 'react'
import { LmsHeader } from '../../components/lms/Header'
import { useCheckoutStore } from '../../store/checkout'

export default function CheckoutSuccessPage() {
  const { course, reset } = useCheckoutStore()

  useEffect(() => {
    if (!course) return
    try {
      const stored = JSON.parse(localStorage.getItem('fansedu_enrolled_courses') || '[]')
      if (!stored.some((item: { program?: { slug?: string } }) => item.program?.slug === course.slug)) {
        stored.unshift({
          id: `enroll-${Date.now()}`,
          program: {
            slug: course.slug,
            title: course.title,
            thumbnail: course.thumbnail || '',
          },
          progressPercent: 0,
          enrolledAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
        })
        localStorage.setItem('fansedu_enrolled_courses', JSON.stringify(stored))
      }
    } catch {
      /* ignore */
    }
  }, [course])

  const goCourses = () => {
    reset()
    window.location.hash = '#/student/courses'
  }

  const goHome = () => {
    reset()
    window.location.hash = '#/'
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      <LmsHeader />
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full mx-auto text-center rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-5 text-3xl shadow-xs">
            ✓
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
            Pendaftaran Berhasil Diproses!
          </h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Terima kasih! Bukti konfirmasi pembayaran untuk program
            {course ? <strong className="text-slate-900"> &ldquo;{course.title}&rdquo;</strong> : ' yang Anda pilih'} telah berhasil dikirim. Kelas kini telah aktif dan siap kamu pelajari.
          </p>
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200/80 text-left text-xs text-teal-900 mb-6 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>💡</span> Akses Langsung Materi Kelas
            </p>
            <p className="text-teal-700/90 leading-relaxed">
              Buka menu Kursus Saya di dashboard untuk membaca modul PDF &amp; PPT, menonton video pembelajaran, masuk ke link Zoom/Meet, dan mengerjakan simulasi tryout.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={goCourses}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 shadow-md transition-all hover:scale-[1.01]"
            >
              Buka Kelas di Dashboard →
            </button>
            <button
              type="button"
              onClick={goHome}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Ke Beranda
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

import { LmsHeader } from '../../components/lms/Header'
import { useCheckoutStore } from '../../store/checkout'

export default function CheckoutSuccessPage() {
  const { course, reset } = useCheckoutStore()

  const goCourses = () => {
    reset()
    window.location.hash = '#/student/courses'
  }

  const goHome = () => {
    reset()
    window.location.hash = '#/'
  }

  return (
    <div className="min-h-screen flex flex-col">
      <LmsHeader />
      <main className="flex-1 flex items-center justify-center py-20">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bukti Pembayaran Terkirim</h1>
          <p className="text-gray-600 mb-4">
            Terima kasih. Bukti transfer serta data pengirim (nama dan nomor rekening) yang Anda kirim telah kami terima. Konfirmasi pembayaran akan diproses; setelah verifikasi, Anda akan memiliki akses ke program
            {course ? ` "${course.title}"` : ''}.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Anda dapat kembali ke beranda atau masuk ke dashboard untuk melihat status pendaftaran.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button type="button" onClick={goHome} className="inline-flex px-6 py-3 rounded-full border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50">
              Kembali ke Beranda
            </button>
            <button type="button" onClick={goCourses} className="inline-flex px-8 py-3.5 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover">
              Ke Dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

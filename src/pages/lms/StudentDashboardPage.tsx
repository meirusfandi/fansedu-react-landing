import { useEffect, useState } from 'react'
import { getStudentDashboard } from '../../lib/api'

export default function StudentDashboardPage() {
  const [dashboard, setDashboard] = useState<{ coursesCount?: number } | null>(null)

  useEffect(() => {
    getStudentDashboard()
      .then((res) => setDashboard(res))
      .catch(() => {})
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Siswa</h1>
      {dashboard?.coursesCount != null && (
        <p className="text-gray-600 mb-4">Anda terdaftar di {dashboard.coursesCount} kursus.</p>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <a href="#/student/courses" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">My Courses</h2>
          <p className="text-sm text-gray-500">Lanjutkan belajar dan lihat progress</p>
        </a>
        <a href="#/student/tryout" className="block p-6 rounded-2xl bg-white border-2 border-primary/20 hover:border-primary/40 hover:shadow-md relative">
          <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Gratis</span>
          <h2 className="font-semibold text-gray-900 mb-1">TryOut OSN</h2>
          <p className="text-sm text-gray-500">Daftar tryout dan ikut ujian dari sini setelah Anda punya akun.</p>
        </a>
        <a href="#/student/transactions" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Transactions</h2>
          <p className="text-sm text-gray-500">Riwayat pembayaran</p>
        </a>
        <a href="#/student/certificates" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Certificates</h2>
          <p className="text-sm text-gray-500">Sertifikat kelulusan</p>
        </a>
      </div>
    </div>
  )
}

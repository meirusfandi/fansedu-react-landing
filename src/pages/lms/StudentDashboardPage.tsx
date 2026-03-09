export default function StudentDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Siswa</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <a href="#/student/courses" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">My Courses</h2>
          <p className="text-sm text-gray-500">Lanjutkan belajar dan lihat progress</p>
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

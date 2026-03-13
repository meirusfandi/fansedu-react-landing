export default function InstructorDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Guru</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Kursus Aktif</p>
          <p className="text-2xl font-bold text-gray-900">3</p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Total Siswa</p>
          <p className="text-2xl font-bold text-gray-900">256</p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Pendapatan Bulan Ini</p>
          <p className="text-2xl font-bold text-primary">Rp12.500.000</p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Rating Rata-rata</p>
          <p className="text-2xl font-bold text-gray-900">4.9 ★</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <a href="#/instructor/courses" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Kursus Saya</h2>
          <p className="text-sm text-gray-500">Kelola materi dan modul kursus</p>
        </a>
        <a href="#/instructor/students" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Siswa</h2>
          <p className="text-sm text-gray-500">Lihat daftar siswa dan progress</p>
        </a>
        <a href="#/instructor/tryouts" className="block p-6 rounded-2xl bg-white border hover:border-primary/30 hover:shadow-md">
          <h2 className="font-semibold text-gray-900 mb-1">Analisis Tryout</h2>
          <p className="text-sm text-gray-500">Analisis per soal, daftar peserta, dan analisis AI per siswa</p>
        </a>
      </div>
    </div>
  )
}

import { getOpenTryouts, getTryoutScheduleText } from '../../data/tryoutList'

export default function StudentTryoutPage() {
  const tryouts = getOpenTryouts()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Tryout</h1>
      <p className="text-gray-500 mb-8">
        Setelah punya akun, Anda bisa mendaftar tryout dari sini. Pilih tryout di bawah untuk melihat detail dan jadwal, lalu daftar untuk ikut ujian.
      </p>

      {tryouts.length === 0 ? (
        <div className="border rounded-2xl p-8 bg-white text-center text-gray-500">
          Belum ada tryout yang terbuka. Cek kembali nanti.
        </div>
      ) : (
        <div className="space-y-4">
          {tryouts.map((t) => (
            <a
              key={t.id}
              href={t.detailPath}
              className="block border rounded-2xl p-6 bg-white hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-semibold text-gray-900">{t.title}</h2>
                    {t.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{getTryoutScheduleText(t)}</p>
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

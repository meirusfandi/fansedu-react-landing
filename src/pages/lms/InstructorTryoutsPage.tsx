import { getOpenTryouts, getTryoutScheduleText } from '../../data/tryoutList'

export default function InstructorTryoutsPage() {
  const tryouts = getOpenTryouts()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Analisis Tryout</h1>
      <p className="text-gray-500 mb-8">
        Pilih tryout untuk melihat analisis per soal, daftar peserta, dan analisis AI per siswa.
      </p>

      {tryouts.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-gray-500">
          Belum ada tryout. Data tryout bisa dari API nantinya.
        </div>
      ) : (
        <div className="space-y-4">
          {tryouts.map((t) => (
            <a
              key={t.id}
              href={`#/instructor/tryouts/${encodeURIComponent(t.id)}`}
              className="block rounded-2xl border bg-white p-6 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-semibold text-gray-900">{t.title}</h2>
                    {t.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{getTryoutScheduleText(t)}</p>
                </div>
                <span className="shrink-0 text-primary font-medium text-sm">Lihat analisis →</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

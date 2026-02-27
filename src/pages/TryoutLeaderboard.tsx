import '../App.css'
import { isLeaderboardVisible } from '../utils/tryoutDates'

interface LeaderboardEntry {
  rank: number
  name: string
  school: string
  score: number | null
  usedAI: boolean | null
}

// Placeholder data; nanti diisi dari backend setelah TryOut selesai
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: '—', school: '—', score: null, usedAI: null },
  { rank: 2, name: '—', school: '—', score: null, usedAI: null },
  { rank: 3, name: '—', school: '—', score: null, usedAI: null },
]

export default function TryoutLeaderboardPage() {
  const visible = isLeaderboardVisible()

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a href="#/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center">
              <span className="font-display font-bold text-[var(--bg)] text-lg">F</span>
            </div>
            <span className="font-display font-semibold text-xl hidden sm:inline">Fansedu</span>
          </a>
          <a href="#/tryout-info" className="nav-link font-medium text-sm">
            ← Detail TryOut
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!visible ? (
          <>
            <div className="mb-8 text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--fg-muted)] text-xs font-semibold uppercase tracking-wide mb-4">
                Leaderboard
              </span>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-[var(--fg)] mb-4">
                Leaderboard Belum Tersedia
              </h1>
              <p className="text-[var(--fg-muted)] max-w-md mx-auto">
                Leaderboard TryOut akan ditampilkan setelah <strong className="text-[var(--fg)]">5 Maret 2026</strong>. Silakan kembali setelah tanggal tersebut.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <a href="#/tryout-info" className="btn-secondary px-8 py-4 rounded-full font-semibold text-center">
                ← Detail TryOut
              </a>
              <a href="#/" className="btn-secondary px-8 py-4 rounded-full font-semibold text-center">
                Kembali ke Beranda
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent)] text-[var(--bg)] text-xs font-semibold uppercase tracking-wide mb-4">
                Leaderboard
              </span>
              <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-[var(--fg)] mb-2">
                Leaderboard TryOut OSN Informatika 2026
              </h1>
              <p className="text-[var(--fg-muted)]">
                Peringkat peserta berdasarkan total skor TryOut. Kolom &quot;Penggunaan AI&quot; menandai apakah peserta mengaku menggunakan bantuan AI saat
                mengerjakan.
              </p>
            </div>

            <section className="mb-8">
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                      <th className="text-left py-3 px-4 text-[var(--fg-muted)] font-medium">Peringkat</th>
                      <th className="text-left py-3 px-4 text-[var(--fg-muted)] font-medium">Nama</th>
                      <th className="text-left py-3 px-4 text-[var(--fg-muted)] font-medium">Asal Sekolah</th>
                      <th className="text-right py-3 px-4 text-[var(--fg-muted)] font-medium">Skor</th>
                      <th className="text-center py-3 px-4 text-[var(--fg-muted)] font-medium">Penggunaan AI</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--fg-muted)]">
                    {MOCK_LEADERBOARD.map((row) => (
                      <tr key={row.rank} className="border-b border-[var(--border)] last:border-b-0">
                        <td className="py-3 px-4 font-bold text-[var(--accent)]">{row.rank}</td>
                        <td className="py-3 px-4 text-[var(--fg)]">{row.name}</td>
                        <td className="py-3 px-4">{row.school}</td>
                        <td className="py-3 px-4 text-right font-medium text-[var(--fg)]">
                          {row.score === null ? '—' : row.score}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.usedAI === null ? '—' : row.usedAI ? 'Ya' : 'Tidak'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[var(--fg-muted)] text-xs mt-3 italic">
                Catatan: Data ini akan diisi dari sistem backend setelah TryOut 5 Maret 2026 selesai. Peserta yang mengaku menggunakan bantuan AI akan
                ditandai di kolom &quot;Penggunaan AI&quot;.
              </p>
            </section>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <a href="#/tryout-info" className="btn-secondary px-8 py-4 rounded-full font-semibold text-center">
                ← Kembali ke Detail TryOut
              </a>
              <a href="#/" className="btn-secondary px-8 py-4 rounded-full font-semibold text-center">
                Kembali ke Beranda
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  )
}


import '../App.css'
import { isLeaderboardVisible, isRegistrationOpen } from '../utils/tryoutDates'

export default function TryoutInfoPage() {
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
          <a href="#/" className="nav-link font-medium text-sm">
            ← Beranda
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent)] text-[var(--bg)] text-xs font-semibold uppercase tracking-wide mb-4">
            Free TryOut
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-[var(--fg)] mb-2">
            Informasi TryOut OSN Informatika 2026
          </h1>
          <p className="text-[var(--fg-muted)]">
            Semua yang perlu Anda ketahui: jadwal, format soal, penilaian, dan leaderboard (termasuk kebijakan penggunaan AI).
          </p>
        </div>

        {/* 1. Informasi TryOut */}
        <section className="mb-16">
          <h2 className="font-display font-bold text-2xl text-[var(--fg)] mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center text-sm font-bold">1</span>
            Informasi TryOut
          </h2>
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Jadwal</h3>
              <p className="text-[var(--fg-muted)]">
                <strong className="text-[var(--fg)]">Kamis, 5 Maret 2026</strong>, pukul <strong className="text-[var(--fg)]">13.00 WIB</strong>. TryOut dilaksanakan secara online; link dan akses ujian akan dikirim ke email peserta sekitar 1 jam sebelum pelaksanaan.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Peserta</h3>
              <p className="text-[var(--fg-muted)]">
                Siswa SMA/SMK/sederajat yang berminat mengikuti OSN Informatika. Satu akun per peserta. Pendaftaran gratis melalui form resmi.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Pendaftaran</h3>
              <p className="text-[var(--fg-muted)] mb-4">
                Daftar melalui link Google Form. Pastikan data nama, asal sekolah, kelas, dan email valid. Batas pendaftaran: <strong className="text-[var(--fg)]">Rabu, 4 Maret 2026 pukul 23.59 WIB</strong>.
              </p>
              {isRegistrationOpen() && (
                <a
                  href="https://forms.gle/y9RMAYeS6bxJ6axH6"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-primary px-6 py-3 rounded-full font-semibold inline-block"
                >
                  Daftar TryOut
                </a>
              )}
            </div>
          </div>
        </section>

        {/* 2. Detail Soal */}
        <section className="mb-16">
          <h2 className="font-display font-bold text-2xl text-[var(--fg)] mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center text-sm font-bold">2</span>
            Detail Soal TryOut
          </h2>
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 space-y-6">
            <p className="text-[var(--fg-muted)]">
              Tes seleksi terdiri dari <strong className="text-[var(--fg)]">20 soal</strong> dengan waktu pengerjaan maksimal <strong className="text-[var(--fg)]">90 menit</strong>.
            </p>
            <p className="text-[var(--fg-muted)]">
              Soal terbagi atas 3 bagian:
            </p>

            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <h3 className="font-semibold text-[var(--accent)] mb-1">Bagian A: Abstraksi Berpikir Komputasional</h3>
                <p className="text-[var(--fg-muted)] text-sm">Soal cerita bergambar.</p>
              </div>
              <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <h3 className="font-semibold text-[var(--accent)] mb-1">Bagian B: Pemecahan Masalah Komputasional</h3>
                <p className="text-[var(--fg-muted)] text-sm">Soal pemrograman kompetitif sederhana.</p>
              </div>
              <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <h3 className="font-semibold text-[var(--accent)] mb-1">Bagian C: Pemahaman Algoritma dalam Bahasa C++</h3>
                <p className="text-[var(--fg-muted)] text-sm">Soal memahami kode C++.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/50">
              <span className="text-[var(--accent)] shrink-0">ℹ</span>
              <p className="text-[var(--fg-muted)] text-sm">
                Waktu pengerjaan maksimal 90 menit berlaku untuk seluruh bagian. Pastikan koneksi internet stabil dan perangkat siap sebelum memulai.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Cara Penilaian */}
        <section className="mb-16">
          <h2 className="font-display font-bold text-2xl text-[var(--fg)] mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center text-sm font-bold">3</span>
            Cara Penilaian
          </h2>
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 space-y-6">
            <p className="text-[var(--fg-muted)]">
              Cara penilaian TryOut ini mengacu pada <strong className="text-[var(--fg)]">sistem penilaian OSN tingkat Kabupaten/Kota (OSN-K)</strong> Bidang Informatika yang berlaku saat ini.
            </p>
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Bentuk Soal & Poin</h3>
              <p className="text-[var(--fg-muted)] mb-4">
                Soal dapat berupa <strong className="text-[var(--fg)]">pilihan ganda</strong>, <strong className="text-[var(--fg)]">isian singkat</strong>, atau <strong className="text-[var(--fg)]">benar/salah</strong>. Tidak ada soal esai. Poin per jawaban benar:
              </p>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                      <th className="text-left py-3 px-4 text-[var(--fg-muted)] font-medium">Jenis Soal</th>
                      <th className="text-left py-3 px-4 text-[var(--fg-muted)] font-medium">Poin per Jawaban Benar</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--fg-muted)]">
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-3 px-4">Pilihan ganda</td>
                      <td className="py-3 px-4 font-medium text-[var(--fg)]">1 poin</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-3 px-4">Benar / Salah</td>
                      <td className="py-3 px-4 font-medium text-[var(--fg)]">1 poin</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-3 px-4">Isian singkat</td>
                      <td className="py-3 px-4 font-medium text-[var(--fg)]">2 poin</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Tidak Ada Pengurangan Nilai</h3>
              <p className="text-[var(--fg-muted)]">
                <strong className="text-[var(--fg)]">Jawaban salah atau kosong tidak mengurangi skor.</strong> Hanya jawaban benar yang diberi poin. Total skor peserta = jumlah poin dari semua jawaban benar.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Pengumuman Hasil</h3>
              <p className="text-[var(--fg-muted)]">
                Hasil dan leaderboard diumumkan setelah periode TryOut berakhir. Peserta dapat melihat skor dan peringkat di halaman ini (bagian Leaderboard).
              </p>
            </div>
          </div>
        </section>

        {/* 4. Leaderboard & Penggunaan AI */}
        <section className="mb-16">
          <h2 className="font-display font-bold text-2xl text-[var(--fg)] mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center text-sm font-bold">4</span>
            Leaderboard & Penggunaan AI
          </h2>
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-semibold text-[var(--fg)] mb-2">Kebijakan Penggunaan AI</h3>
              <p className="text-[var(--fg-muted)] mb-4">
                TryOut ini bersifat <strong className="text-[var(--fg)]">latihan</strong>. Penggunaan alat bantu (termasuk AI seperti ChatGPT, Copilot, atau
                pencarian) diperbolehkan, namun akan <strong className="text-[var(--fg)]">ditandai di leaderboard</strong> agar transparan. Untuk persiapan OSN
                resmi, peserta disarankan juga berlatih tanpa bantuan AI agar kemampuan mandiri terukur.
              </p>
              <ul className="list-disc list-inside text-[var(--fg-muted)] space-y-1">
                <li>Peserta yang mengaku menggunakan bantuan AI akan dicantumkan dengan penanda di kolom &quot;Penggunaan AI&quot;.</li>
                <li>Leaderboard dapat menyertakan filter: tampil semua, atau hanya peserta tanpa bantuan AI (untuk perbandingan kemampuan murni).</li>
              </ul>
            </div>
            {isLeaderboardVisible() && (
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <p className="text-[var(--fg-muted)] text-sm">
                  Leaderboard lengkap TryOut (setelah 5 Maret 2026) dapat dilihat di halaman khusus leaderboard berikut. Peringkat disusun berdasarkan total
                  skor, dengan penanda penggunaan AI sesuai deklarasi peserta.
                </p>
                <a href="#/leaderboard" className="btn-secondary px-6 py-3 rounded-full font-semibold text-center whitespace-nowrap">
                  Lihat Leaderboard
                </a>
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          {isRegistrationOpen() && (
            <a
              href="https://forms.gle/y9RMAYeS6bxJ6axH6"
              target="_blank"
              rel="noreferrer noopener"
              className="btn-primary px-8 py-4 rounded-full font-semibold text-center"
            >
              Daftar TryOut
            </a>
          )}
          <a href="#/" className="btn-secondary px-8 py-4 rounded-full font-semibold text-center">
            ← Kembali ke Beranda
          </a>
        </div>
      </main>
    </div>
  )
}

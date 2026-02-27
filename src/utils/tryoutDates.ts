// Batas: 5 Maret 2026 00:00 WIB — setelah ini leaderboard tampil, tombol daftar hilang
const TRYOUT_DATE_END = new Date('2026-03-05T00:00:00+07:00')

/** Leaderboard ditampilkan mulai 5 Maret 2026 (setelah TryOut). */
export function isLeaderboardVisible(): boolean {
  return new Date() >= TRYOUT_DATE_END
}

/** Tombol Daftar TryOut tampil hanya sebelum 5 Maret (lewat 4 Maret 23:59 = hilang). */
export function isRegistrationOpen(): boolean {
  return new Date() < TRYOUT_DATE_END
}

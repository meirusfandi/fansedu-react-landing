/**
 * Pesan untuk pengguna akhir — tanpa detail teknis atau teks mentah dari server.
 */

export const USER_FACING_SYSTEM_ERROR =
  'Terjadi kendala pada sistem. Kami akan menanganinya segera — silakan coba lagi nanti.'

export const USER_FACING_NETWORK_ERROR =
  'Koneksi terputus atau server tidak terjangkau. Periksa jaringan Anda lalu coba lagi.'

export function getUserFacingHttpMessage(status: number): string {
  if (status === 0 || !Number.isFinite(status) || status < 100) {
    return USER_FACING_NETWORK_ERROR
  }
  if (status >= 500) return USER_FACING_SYSTEM_ERROR
  if (status === 401) {
    return 'Sesi telah berakhir atau Anda belum masuk. Silakan masuk kembali.'
  }
  if (status === 403) {
    return 'Anda tidak memiliki izin untuk tindakan ini.'
  }
  if (status === 404) {
    return 'Data tidak ditemukan atau sudah tidak tersedia.'
  }
  if (status === 408) {
    return 'Permintaan memakan waktu terlalu lama. Silakan coba lagi.'
  }
  if (status === 429) {
    return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.'
  }
  if (status === 409) {
    return 'Tindakan tidak dapat dilakukan karena status data sudah berubah. Muat ulang halaman lalu coba lagi.'
  }
  if (status === 422 || status === 400) {
    return 'Beberapa informasi yang Anda kirim tidak dapat diproses. Periksa kembali lalu coba lagi.'
  }
  if (status === 501) {
    return 'Fitur ini belum tersedia di server. Silakan coba lagi nanti atau hubungi admin.'
  }
  return 'Terjadi kesalahan. Silakan coba lagi nanti.'
}

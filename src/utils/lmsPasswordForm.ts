/** Validasi form ubah / atur password. Mengembalikan pesan error atau `null` jika lolos. */
export function validateLmsPasswordChange(input: {
  newPassword: string
  confirmPassword: string
  firstPasswordMode: boolean
  currentPassword: string
}): string | null {
  const { newPassword, confirmPassword, firstPasswordMode, currentPassword } = input
  if (newPassword.length < 6) {
    return 'Password baru minimal 6 karakter.'
  }
  if (newPassword !== confirmPassword) {
    return 'Konfirmasi password tidak sama.'
  }
  if (!firstPasswordMode && !currentPassword.trim()) {
    return 'Password saat ini wajib diisi.'
  }
  return null
}

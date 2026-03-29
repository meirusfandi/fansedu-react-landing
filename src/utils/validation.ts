/** Format email sederhana untuk validasi form. */
export function isValidEmail(email: string): boolean {
  const t = email.trim()
  if (t.length < 5) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

/** Nama lengkap minimal panjang setelah trim. */
export const MIN_REGISTRATION_NAME_LENGTH = 2

export function isValidRegistrationName(name: string): boolean {
  return name.trim().length >= MIN_REGISTRATION_NAME_LENGTH
}

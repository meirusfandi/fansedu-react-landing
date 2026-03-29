function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** Validasi nomor HP/WA untuk pendaftaran: 10–15 digit setelah menghapus non-angka. */
export function isValidRegistrationPhone(raw: string): boolean {
  const digits = digitsOnly(raw)
  return digits.length >= 10 && digits.length <= 15
}

/** Nilai yang dikirim ke API (trim spasi berlebih). */
export function normalizeRegistrationPhone(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

/**
 * Satu input pengguna → dua field untuk backend: `phone` (0xx…) dan `whatsapp` (62xx…, tanpa +).
 */
export function splitPhoneForRegisterApi(raw: string): { phone: string; whatsapp: string } {
  const d = digitsOnly(raw)
  if (!d) return { phone: '', whatsapp: '' }

  let national: string
  let international: string

  if (d.startsWith('62') && d.length >= 11) {
    international = d
    national = `0${d.slice(2)}`
  } else if (d.startsWith('0')) {
    national = d
    international = `62${d.slice(1)}`
  } else if (d.startsWith('8') && d.length >= 9) {
    national = `0${d}`
    international = `62${d}`
  } else {
    national = d
    international = d.startsWith('62') ? d : `62${d.replace(/^0+/, '')}`
  }

  if (!international.startsWith('62') && national.startsWith('0')) {
    international = `62${national.slice(1)}`
  }

  return { phone: national, whatsapp: international }
}

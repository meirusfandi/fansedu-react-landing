export interface TransactionStatusMeta {
  label: string
  badgeClassName: string
}

function normalizeStatusToken(status: string | null | undefined): string {
  return (status ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function isPaidTransactionStatus(status: string | null | undefined): boolean {
  const token = normalizeStatusToken(status)
  return token === 'paid' || token === 'success' || token === 'settlement' || token === 'completed'
}

export function isPendingUploadTransactionStatus(status: string | null | undefined): boolean {
  const token = normalizeStatusToken(status)
  return (
    token === 'pending' ||
    token === 'unpaid' ||
    token === 'awaiting_payment' ||
    token === 'waiting_payment' ||
    token === 'payment_pending'
  )
}

export function isVerificationTransactionStatus(status: string | null | undefined): boolean {
  const token = normalizeStatusToken(status)
  return (
    token === 'proof_uploaded' ||
    token === 'awaiting_verification' ||
    token === 'waiting_verification' ||
    token === 'pending_verification' ||
    token === 'verifying' ||
    token === 'processing' ||
    token === 'review'
  )
}

export function isPendingTransactionStatus(status: string | null | undefined): boolean {
  return isPendingUploadTransactionStatus(status) || isVerificationTransactionStatus(status)
}

export function getTransactionStatusMeta(status: string | null | undefined): TransactionStatusMeta {
  const token = normalizeStatusToken(status)

  if (isPaidTransactionStatus(token)) {
    return {
      label: 'Lunas',
      badgeClassName: 'bg-green-100 text-green-700',
    }
  }

  if (isPendingUploadTransactionStatus(token)) {
    return {
      label: 'Menunggu pembayaran',
      badgeClassName: 'bg-amber-100 text-amber-800',
    }
  }

  if (isVerificationTransactionStatus(token)) {
    return {
      label: 'Menunggu verifikasi',
      badgeClassName: 'bg-blue-100 text-blue-700',
    }
  }

  if (
    token === 'failed' ||
    token === 'expired' ||
    token === 'cancelled' ||
    token === 'canceled' ||
    token === 'denied'
  ) {
    return {
      label: 'Gagal',
      badgeClassName: 'bg-rose-100 text-rose-700',
    }
  }

  return {
    label: status?.trim() || 'Tidak diketahui',
    badgeClassName: 'bg-slate-100 text-slate-700',
  }
}

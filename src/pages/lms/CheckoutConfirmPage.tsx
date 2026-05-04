import { useState, useEffect } from 'react'
import { LmsHeader } from '../../components/lms/Header'
import { submitPaymentProof, ApiError, getTransactions, createPaymentSession } from '../../lib/api'
import {
  getTransactionStatusMeta,
  isPaidTransactionStatus,
  isPendingUploadTransactionStatus,
  isVerificationTransactionStatus,
} from '../../utils/transactionStatus'

/** Rekening untuk transfer (sama dengan CheckoutPage) */
const BANK_ACCOUNTS = [
  { bank: 'Bank BCA', accountNo: '8330183471', accountName: 'Mei Rusfandi' },
  { bank: 'Bank Mandiri', accountNo: '1270010341814', accountName: 'Mei Rusfandi' },
] as const

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button type="button" onClick={onCopy} className="ml-2 inline-flex items-center text-gray-500 hover:text-primary" title={`Salin ${label}`} aria-label={`Salin ${label}`}>
      {copied ? (
        <svg className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3-3a1 1 0 111.415-1.41l2.293 2.292 6.493-6.493a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

export default function CheckoutConfirmPage({
  orderId,
  embedded = false,
  scope = 'student',
}: {
  orderId: string | null
  embedded?: boolean
  scope?: 'student' | 'guru'
}) {
  const [transactionDetail, setTransactionDetail] = useState<{
    orderId: string
    status: string
    total: number
    programs: { title: string }[]
  } | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [senderAccountNo, setSenderAccountNo] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderBank, setSenderBank] = useState('')
  const [proofNote, setProofNote] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transferAmount, setTransferAmount] = useState<number | null>(null)
  const [midtransLoading, setMidtransLoading] = useState(false)
  const transactionsHref = scope === 'guru' ? '#/guru/transactions' : '#/student/transactions'

  useEffect(() => {
    if (!orderId) return
    getTransactions({ page: 1, limit: 50, search: orderId, status: 'all' })
      .then((res) => {
        const found = res.data.find((t) => t.orderId === orderId)
        if (!found) {
          setTransactionDetail(null)
          return
        }
        if (typeof found.total === 'number') setTransferAmount(found.total)
        setTransactionDetail({
          orderId: found.orderId,
          status: found.status,
          total: found.total,
          programs: found.programs,
        })
      })
      .catch(() => {})
  }, [orderId])

  const statusMeta = getTransactionStatusMeta(transactionDetail?.status)
  const canUploadProof = transactionDetail ? isPendingUploadTransactionStatus(transactionDetail.status) : true
  const isVerificationPhase = transactionDetail ? isVerificationTransactionStatus(transactionDetail.status) : false
  const isPaid = isPaidTransactionStatus(transactionDetail?.status)

  const onPayMidtrans = async () => {
    if (!orderId) return
    setMidtransLoading(true)
    setError(null)
    try {
      const session = await createPaymentSession({
        orderId,
        paymentMethod: 'midtrans',
        ...(transferAmount != null && transferAmount > 0 ? { amount: transferAmount } : {}),
      })
      const url = session.redirectUrl ?? session.paymentUrl
      if (url) {
        window.location.assign(url)
        return
      }
      setError('Tidak ada URL pembayaran Midtrans dari server.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membuka pembayaran Midtrans.')
    } finally {
      setMidtransLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderId) return
    if (!proofFile) {
      setError('Pilih file bukti transfer (gambar atau PDF).')
      return
    }
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('proof', proofFile)
      form.append('senderAccountNo', senderAccountNo.trim())
      form.append('senderName', senderName.trim())
      if (senderBank.trim()) form.append('senderBank', senderBank.trim())
      if (proofNote.trim()) form.append('note', proofNote.trim())
      await submitPaymentProof(orderId, form)
      setSuccess('Bukti pembayaran berhasil dikirim. Status transaksi akan mengikuti update dari API.')
      setProofFile(null)
      const refreshed = await getTransactions({ page: 1, limit: 50, search: orderId, status: 'all' })
      const found = refreshed.data.find((t) => t.orderId === orderId)
      if (found) {
        setTransactionDetail({
          orderId: found.orderId,
          status: found.status,
          total: found.total,
          programs: found.programs,
        })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengirim bukti pembayaran.')
    } finally {
      setLoading(false)
    }
  }

  if (!orderId) {
    if (embedded) {
      return (
        <div className="text-center max-w-md">
          <p className="text-gray-600 mb-4">Order ID tidak valid atau tidak ditemukan.</p>
          <a href={transactionsHref} className="text-primary font-medium hover:underline">← Ke Riwayat Transaksi</a>
        </div>
      )
    }
    return (
      <div className="min-h-screen flex flex-col">
        <LmsHeader />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <p className="text-gray-600 mb-4">Order ID tidak valid atau tidak ditemukan.</p>
            <a href={transactionsHref} className="text-primary font-medium hover:underline">← Ke Riwayat Transaksi</a>
          </div>
        </main>
      </div>
    )
  }

  const content = (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Detail Transaksi</h1>
      <p className="text-gray-600 mb-4">
        Order ID <strong className="font-mono">{orderId}</strong>
      </p>

      <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <p className="text-sm text-slate-600">Status:</p>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMeta.badgeClassName}`}>
            {statusMeta.label}
          </span>
        </div>
        <p className="text-sm text-slate-600 mb-1">
          Program: {transactionDetail?.programs?.map((p) => p.title).join(', ') || '-'}
        </p>
        <p className="text-sm text-slate-600">
          Total: {transferAmount != null ? `Rp${transferAmount.toLocaleString('id-ID')}` : 'Menunggu data dari server'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm" role="status">
          {success}
        </div>
      )}

      {!canUploadProof && (
        <div className="mb-6 p-4 rounded-xl border border-blue-200 bg-blue-50 text-sm text-blue-900">
          {isPaid
            ? 'Pembayaran sudah lunas. Tidak perlu upload bukti lagi.'
            : isVerificationPhase
              ? 'Bukti pembayaran sudah terkirim dan sedang diverifikasi. Tunggu update status terbaru dari API.'
              : 'Transaksi ini tidak dalam status upload bukti pembayaran.'}
        </div>
      )}

      {canUploadProof && (
      <div className="mb-6 p-4 rounded-xl border border-primary/30 bg-primary/5">
        <p className="text-sm font-medium text-gray-900 mb-2">Bayar dengan Midtrans</p>
        <p className="text-xs text-gray-600 mb-3">
          Buka halaman pembayaran Midtrans (Snap). Setelah pembayaran, status akan terupdate otomatis lewat webhook.
        </p>
        <button
          type="button"
          onClick={onPayMidtrans}
          disabled={midtransLoading}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
        >
          {midtransLoading ? 'Membuka Midtrans...' : 'Lanjut ke Midtrans'}
        </button>
      </div>
      )}

      {canUploadProof && (
      <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <p className="text-sm font-medium text-slate-700 mb-3">Pastikan Anda sudah transfer ke rekening berikut dengan nominal yang sesuai:</p>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-slate-500 font-medium mb-1">Nomor rekening tujuan</p>
            <ul className="text-slate-900 font-medium space-y-1">
              {BANK_ACCOUNTS.map((acc) => (
                <li key={acc.bank} className="font-mono">
                  {acc.bank}: {acc.accountNo} — a.n. {acc.accountName}
                  <CopyButton text={acc.accountNo} label={`nomor rekening ${acc.bank}`} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-slate-500 font-medium mb-0.5">Nominal transfer (termasuk kode unik)</p>
            <p className="text-primary font-semibold text-base inline-flex items-center">
              {transferAmount != null ? `Rp${transferAmount.toLocaleString('id-ID')}` : 'Sesuai slip pembayaran Anda'}
              {transferAmount != null && <CopyButton text={String(transferAmount)} label="nominal transfer" />}
            </p>
          </div>
        </div>
      </div>
      )}

      {canUploadProof && (
      <section className="border rounded-2xl p-6 bg-white">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bukti transfer <span className="text-red-500">*</span></label>
            <input type="file" accept="image/*,.pdf" onChange={(e) => { setProofFile(e.target.files?.[0] ?? null); setError(null) }} className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:bg-gray-50 file:font-medium" />
            <p className="text-xs text-gray-500 mt-1">Format: gambar (JPG, PNG) atau PDF.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. Rekening Pengirim <span className="text-red-500">*</span></label>
            <input type="text" value={senderAccountNo} onChange={(e) => setSenderAccountNo(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm" placeholder="Contoh: 1234567890" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pengirim <span className="text-red-500">*</span></label>
            <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm" placeholder="Nama sesuai rekening pengirim" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Pengirim (opsional)</label>
            <input type="text" value={senderBank} onChange={(e) => setSenderBank(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm" placeholder="Contoh: BCA, Mandiri" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
            <textarea value={proofNote} onChange={(e) => setProofNote(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm" placeholder="Info tambahan untuk verifikasi" />
          </div>
          <div className="flex gap-3 pt-2">
            <a href={transactionsHref} className="flex-1 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 text-center">Batal</a>
            <button type="submit" disabled={loading || !proofFile} className="flex-1 py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50">
              {loading ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
            </button>
          </div>
        </form>
      </section>
      )}

      <div className="mt-6">
        <a href={transactionsHref} className="text-primary font-medium hover:underline text-sm">
          ← Kembali ke Riwayat Transaksi
        </a>
      </div>
    </>
  )

  if (embedded) {
    return (
      <div className="max-w-xl">
        {content}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <LmsHeader />
      <main className="flex-1 py-10">
        <div className="max-w-xl mx-auto px-4">
          {content}
        </div>
      </main>
    </div>
  )
}

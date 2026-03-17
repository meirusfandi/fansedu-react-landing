import { useState, useEffect } from 'react'
import { LmsHeader } from '../../components/lms/Header'
import { submitPaymentProof, ApiError, getTransactions } from '../../lib/api'

/** Rekening untuk transfer (sama dengan CheckoutPage) */
const BANK_ACCOUNTS = [
  { bank: 'Bank BCA', accountNo: '8330183471', accountName: 'Mei Rusfandi' },
  { bank: 'Bank Mandiri', accountNo: '1270010341814', accountName: 'Mei Rusfandi' },
] as const

export default function CheckoutConfirmPage({ orderId }: { orderId: string | null }) {
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [senderAccountNo, setSenderAccountNo] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderBank, setSenderBank] = useState('')
  const [proofNote, setProofNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transferAmount, setTransferAmount] = useState<number | null>(null)

  useEffect(() => {
    if (!orderId) return
    getTransactions()
      .then((res) => {
        const found = res.data.find((t) => t.orderId === orderId)
        if (found && typeof found.total === 'number') setTransferAmount(found.total)
      })
      .catch(() => {})
  }, [orderId])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderId) return
    if (!proofFile) {
      setError('Pilih file bukti transfer (gambar atau PDF).')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('proof', proofFile)
      form.append('senderAccountNo', senderAccountNo.trim())
      form.append('senderName', senderName.trim())
      if (senderBank.trim()) form.append('senderBank', senderBank.trim())
      if (proofNote.trim()) form.append('note', proofNote.trim())
      await submitPaymentProof(orderId, form)
      window.location.hash = '#/checkout/success'
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengirim bukti pembayaran.')
    } finally {
      setLoading(false)
    }
  }

  if (!orderId) {
    return (
      <div className="min-h-screen flex flex-col">
        <LmsHeader />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <p className="text-gray-600 mb-4">Order ID tidak valid atau tidak ditemukan.</p>
            <a href="#/student/transactions" className="text-primary font-medium hover:underline">← Ke Riwayat Transaksi</a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <LmsHeader />
      <main className="flex-1 py-10">
        <div className="max-w-xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Bukti Pembayaran</h1>
          <p className="text-gray-600 mb-6">Transaksi dengan Order ID <strong className="font-mono">{orderId}</strong> menunggu bukti transfer. Isi data pengirim dan upload bukti.</p>

          <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-3">Pastikan Anda sudah transfer ke rekening berikut dengan nominal yang sesuai:</p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500 font-medium mb-1">Nomor rekening tujuan</p>
                <ul className="text-slate-900 font-medium space-y-1">
                  {BANK_ACCOUNTS.map((acc) => (
                    <li key={acc.bank} className="font-mono">
                      {acc.bank}: {acc.accountNo} — a.n. {acc.accountName}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-slate-500 font-medium mb-0.5">Nominal transfer (termasuk kode unik)</p>
                <p className="text-primary font-semibold text-base">
                  {transferAmount != null ? `Rp${transferAmount.toLocaleString('id-ID')}` : 'Sesuai slip pembayaran Anda'}
                </p>
              </div>
            </div>
          </div>

          <section className="border rounded-2xl p-6 bg-white">
            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
              )}
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
                <a href="#/student/transactions" className="flex-1 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 text-center">Batal</a>
                <button type="submit" disabled={loading || !proofFile} className="flex-1 py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50">
                  {loading ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}

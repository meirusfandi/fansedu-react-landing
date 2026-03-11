import { useEffect, useState, useRef } from 'react'
import { LmsHeader } from '../../components/lms/Header'
import { useAuthStore } from '../../store/auth'
import { useCheckoutStore } from '../../store/checkout'
import {
  getPackageBySlug,
  packageToCourse,
  initiateCheckout,
  createPaymentSession,
  ApiError,
} from '../../lib/api'
import type { Course } from '../../types/course'

const PAYMENT_METHODS = [
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'virtual_account', label: 'Virtual Account' },
  { id: 'ewallet', label: 'E-Wallet' },
] as const

export default function CheckoutPage({ programSlug }: { programSlug: string | null }) {
  const slug = programSlug
  const user = useAuthStore((s) => s.user)
  const {
    course,
    setCourse,
    checkoutId,
    setCheckoutId,
    orderSummary,
    setOrderSummary,
    userInfo,
    setUserInfo,
    promoCode,
    setPromoCode,
    paymentMethod,
    setPaymentMethod,
  } = useCheckoutStore()
  const [step, setStep] = useState<'info' | 'payment'>('info')
  const [loadingProgram, setLoadingProgram] = useState(!!slug)
  const [loadingContinue, setLoadingContinue] = useState(false)
  const [loadingPay, setLoadingPay] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prefilledFromUser = useRef(false)

  // Jika sudah login, isi Data Diri dari user (sekali per sesi login)
  useEffect(() => {
    if (!user) {
      prefilledFromUser.current = false
      return
    }
    if (user.name && user.email && !prefilledFromUser.current) {
      setUserInfo({ name: user.name, email: user.email })
      prefilledFromUser.current = true
    }
  }, [user, setUserInfo])

  useEffect(() => {
    if (!slug) {
      setCourse(null)
      setCheckoutId(null)
      setOrderSummary(null)
      setLoadingProgram(false)
      setStep('info')
      return
    }
    setCheckoutId(null)
    setOrderSummary(null)
    setStep('info')
    setLoadingProgram(true)
    setError(null)
    getPackageBySlug(slug)
      .then((pkg) => setCourse(pkg ? packageToCourse(pkg) : null))
      .catch(() => {
        setCourse(null)
        setError('Gagal memuat program.')
      })
      .finally(() => setLoadingProgram(false))
  }, [slug, setCourse, setCheckoutId, setOrderSummary])

  const onContinue = async () => {
    if (!userInfo.name || !userInfo.email || !course) return
    setError(null)
    setLoadingContinue(true)
    try {
      const res = await initiateCheckout({
        programSlug: course.slug,
        name: userInfo.name,
        email: userInfo.email,
      })
      setCheckoutId(res.checkoutId)
      setOrderSummary({
        orderId: res.orderId,
        total: res.total,
        program: res.program,
      })
      setStep('payment')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memulai checkout.')
    } finally {
      setLoadingContinue(false)
    }
  }

  const onPay = async () => {
    if (!checkoutId || !paymentMethod) return
    setError(null)
    setLoadingPay(true)
    try {
      const res = await createPaymentSession({
        checkoutId,
        paymentMethod,
        promoCode: promoCode.trim() || '',
      })
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl
        return
      }
      window.location.hash = '#/checkout/success'
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membuat sesi pembayaran.')
    } finally {
      setLoadingPay(false)
    }
  }

  // Tanpa slug program: arahkan pilih program dulu
  if (!slug) {
    return (
      <div className="min-h-screen flex flex-col">
        <LmsHeader />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Checkout</h2>
            <p className="text-gray-500 mb-6">Pilih program dari katalog terlebih dahulu untuk melanjutkan checkout.</p>
            <a href="#/catalog" className="inline-block py-3 px-6 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90">
              Lihat Katalog Program
            </a>
          </div>
        </main>
      </div>
    )
  }

  if (loadingProgram || (!course && slug)) {
    return (
      <div className="min-h-screen flex flex-col">
        <LmsHeader />
        <main className="flex-1 flex items-center justify-center py-20">
          <p className="text-gray-500">Memuat...</p>
        </main>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col">
        <LmsHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <p className="text-gray-500 mb-4">{error || 'Program tidak ditemukan. Periksa link atau koneksi Anda.'}</p>
            <a href="#/catalog" className="text-primary font-medium hover:underline">← Pilih program dari katalog</a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <LmsHeader />
      <main className="flex-1 py-10">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout Program</h1>
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          <div className="grid lg:grid-cols-5 gap-10">
            <div className="lg:col-span-3 space-y-8">
              <section className="border rounded-2xl p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Ringkasan Program</h2>
                <p className="font-medium text-gray-800">{course.title}</p>
                <p className="text-sm text-gray-500">{course.instructor.name}</p>
                <p className="text-primary font-bold mt-2">{course.priceDisplay}</p>
              </section>
              <section className="border rounded-2xl p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Data Diri</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                    <input type="text" value={userInfo.name} onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })} className="w-full rounded-lg border px-4 py-2.5 text-sm" placeholder="Nama lengkap" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={userInfo.email} onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })} className="w-full rounded-lg border px-4 py-2.5 text-sm" placeholder="email@contoh.com" />
                  </div>
                  {step === 'info' && (
                    <button onClick={onContinue} disabled={!userInfo.name || !userInfo.email || loadingContinue} className="w-full py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50">
                      {loadingContinue ? 'Memproses...' : 'Lanjutkan'}
                    </button>
                  )}
                </div>
              </section>
              {step === 'payment' && (
                <>
                  <section className="border rounded-2xl p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Kode Promo</h2>
                    <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" placeholder="Kode kupon (opsional)" />
                  </section>
                  <section className="border rounded-2xl p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Metode Pembayaran</h2>
                    <div className="space-y-3">
                      {PAYMENT_METHODS.map((pm) => (
                        <label key={pm.id} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer ${paymentMethod === pm.id ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                          <input type="radio" name="pay" checked={paymentMethod === pm.id} onChange={() => setPaymentMethod(pm.id)} />
                          <span className="font-medium">{pm.label}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>
            <div className="lg:col-span-2">
              <div className="sticky top-24 border rounded-2xl p-6 bg-slate-50">
                <h2 className="font-semibold text-gray-900 mb-4">Ringkasan Pesanan</h2>
                {orderSummary?.orderId && (
                  <p className="text-xs text-gray-500 mb-2">Order ID: {orderSummary.orderId}</p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{orderSummary?.program?.priceDisplay ?? course.priceDisplay}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Biaya layanan</span><span>Rp0</span></div>
                  <div className="border-t pt-3 flex justify-between font-bold"><span>Total</span><span>{orderSummary != null ? `Rp${orderSummary.total.toLocaleString('id-ID')}` : course.priceDisplay}</span></div>
                </div>
                {step === 'payment' && (
                  <button onClick={onPay} disabled={!paymentMethod || loadingPay} className="mt-6 w-full py-3.5 rounded-xl bg-primary text-white font-semibold disabled:opacity-50">
                    {loadingPay ? 'Memproses...' : 'Bayar & Daftar Program'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

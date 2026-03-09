import { useEffect, useState } from 'react'
import { LmsHeader } from '../../components/lms/Header'
import { useCheckoutStore } from '../../store/checkout'
import {
  getProgramBySlug,
  initiateCheckout,
  createPaymentSession,
  ApiError,
  type ProgramDetailResponse,
} from '../../lib/api'
import type { Course } from '../../types/course'

const PAYMENT_METHODS = [
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'virtual_account', label: 'Virtual Account' },
  { id: 'ewallet', label: 'E-Wallet' },
] as const

function toCourse(p: ProgramDetailResponse | null): Course | null {
  if (!p) return null
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    shortDescription: p.shortDescription,
    thumbnail: p.thumbnail,
    price: p.price,
    priceDisplay: p.priceDisplay,
    instructor: p.instructor,
    category: p.category,
    level: p.level as Course['level'],
    duration: p.duration,
    rating: p.rating,
    reviewCount: p.reviewCount,
    modules: p.modules,
    reviews: p.reviews,
  }
}

export default function CheckoutPage({ programSlug }: { programSlug: string | null }) {
  const slug = programSlug
  const {
    course,
    setCourse,
    checkoutId,
    setCheckoutId,
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

  useEffect(() => {
    if (!slug) {
      setCourse(null)
      setLoadingProgram(false)
      return
    }
    setLoadingProgram(true)
    setError(null)
    getProgramBySlug(slug)
      .then((res) => setCourse(toCourse(res)))
      .catch(() => {
        setCourse(null)
        setError('Gagal memuat program.')
      })
      .finally(() => setLoadingProgram(false))
  }, [slug, setCourse])

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
        promoCode: promoCode.trim() || undefined,
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
          <p className="text-gray-500">
            {error || 'Program tidak ditemukan.'} <a href="#/catalog" className="text-primary">Pilih program</a>
          </p>
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
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{course.priceDisplay}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Biaya layanan</span><span>Rp0</span></div>
                  <div className="border-t pt-3 flex justify-between font-bold"><span>Total</span><span>{course.priceDisplay}</span></div>
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

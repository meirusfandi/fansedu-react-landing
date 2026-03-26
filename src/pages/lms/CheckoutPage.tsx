import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { LmsHeader } from '../../components/lms/Header'
import { useAuthStore } from '../../store/auth'
import { useCheckoutStore } from '../../store/checkout'
import {
  getPackageBySlug,
  packageToCourse,
  initiateCheckout,
  createPaymentSession,
  submitPaymentProof,
  apiRegister,
  getInstructorProfile,
  getStudentsBySchool,
  ApiError,
  type SchoolStudentItem,
} from '../../lib/api'
import { formatRupiah } from '../../lib/currency'
import { authUserFromApiResponse } from '../../types/auth'

const PAYMENT_METHODS = [
  { id: 'bank_transfer', label: 'Bank Transfer (Mandiri / BCA)' },
] as const

/** Rekening untuk transfer */
const BANK_ACCOUNTS = [
  { bank: 'Bank BCA', accountNo: '8330183471', accountName: 'Mei Rusfandi' },
  { bank: 'Bank Mandiri', accountNo: '1270010341814', accountName: 'Mei Rusfandi' },
] as const

/** Generate kode unik 3 digit (100–999) untuk verifikasi transfer */
function generateUniqueCode(): number {
  return Math.floor(100 + Math.random() * 900)
}

/** Validasi format email sederhana */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

interface CollectiveStudentItem {
  id: string
  name: string
  email: string
  userId?: string
}

/** Ambil harga rupiah dari Course, utamakan field numerik */
function resolveNumericPrice(c: { price?: number; priceEarlyBird?: number; priceNormal?: number } | null): number {
  if (!c) return 0
  // 1) field numerik langsung (sudah di-set oleh packageToCourse)
  if (typeof c.price === 'number' && c.price > 0) return c.price
  if (typeof c.priceEarlyBird === 'number' && c.priceEarlyBird > 0) return c.priceEarlyBird
  if (typeof c.priceNormal === 'number' && c.priceNormal > 0) return c.priceNormal
  return 0
}

/** Ambil harga normal (rupiah) dari Course, utamakan field numerik */
function resolveNormalPrice(c: { priceNormal?: number; price?: number } | null): number {
  if (!c) return 0
  if (typeof c.priceNormal === 'number' && c.priceNormal > 0) return c.priceNormal
  return 0
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button type="button" onClick={copy} className="ml-2 inline-flex items-center gap-1 text-gray-500 hover:text-primary" title={`Salin ${label}`} aria-label={`Salin ${label}`}>
      {copied ? (
        <span className="text-xs text-green-600">Tersalin</span>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </button>
  )
}

export default function CheckoutPage({ programSlug }: { programSlug: string | null }) {
  const slug = programSlug
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
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
    step,
    setStep,
    uniqueCode,
    setUniqueCode,
  } = useCheckoutStore()

  const [loadingProgram, setLoadingProgram] = useState(!!slug)
  const [loadingContinue, setLoadingContinue] = useState(false)
  const [loadingPay, setLoadingPay] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [senderAccountNo, setSenderAccountNo] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderBank, setSenderBank] = useState('')
  const [proofNote, setProofNote] = useState('')
  const [loadingProof, setLoadingProof] = useState(false)
  const [proofError, setProofError] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loadingSetPassword, setLoadingSetPassword] = useState(false)
  const [setPasswordError, setSetPasswordError] = useState<string | null>(null)
  const [isCollectivePurchase, setIsCollectivePurchase] = useState(false)
  const [collectiveStudents, setCollectiveStudents] = useState<CollectiveStudentItem[]>([
    { id: crypto.randomUUID(), name: '', email: '' },
  ])
  const [instructorSchoolId, setInstructorSchoolId] = useState('')
  const [schoolStudentPool, setSchoolStudentPool] = useState<SchoolStudentItem[]>([])
  const [selectedSchoolStudentIds, setSelectedSchoolStudentIds] = useState<string[]>([])
  const [loadingSchoolStudents, setLoadingSchoolStudents] = useState(false)
  const [schoolStudentsError, setSchoolStudentsError] = useState<string | null>(null)
  const [lastLoadedSchoolId, setLastLoadedSchoolId] = useState('')
  const prefilledFromUser = useRef(false)

  // --- Harga dari field numerik (utama), bukan dari string ---
  const normalNum = useMemo(() => resolveNormalPrice(course), [course])
  const earlyNum = useMemo(() => (course?.priceEarlyBird != null && course.priceEarlyBird > 0 ? course.priceEarlyBird : 0), [course])

  const hasEarlyBirdDiscount = normalNum > 0 && earlyNum > 0 && normalNum > earlyNum
  const earlyBirdDiscountAmount = hasEarlyBirdDiscount ? normalNum - earlyNum : 0

  // Harga efektif: utamakan field numerik course.price (sudah dihitung oleh packageToCourse)
  const basePrice = useMemo(() => resolveNumericPrice(course), [course])

  const isGuruBuyer = user?.role === 'guru'
  const validCollectiveStudents = useMemo(
    () =>
      collectiveStudents.filter(
        (item) => item.name.trim() && item.email.trim() && isValidEmail(item.email.trim())
      ),
    [collectiveStudents]
  )
  const collectiveParticipantCount = Math.max(1, validCollectiveStudents.length)
  const purchaseCount = isGuruBuyer && isCollectivePurchase ? collectiveParticipantCount : 1
  const unitPromoPrice = earlyNum > 0 ? earlyNum : basePrice
  const unitNormalPrice = normalNum
  const expectedTotalFromCount = unitPromoPrice > 0 ? unitPromoPrice * purchaseCount : 0
  const expectedNormalTotalFromCount = unitNormalPrice > 0 ? unitNormalPrice * purchaseCount : 0

  // Di halaman checkout (sebelum bayar), jangan tampilkan 3 digit kode unik.
  // Jika backend sudah mengembalikan total yang termasuk uniqueCode, kurangi dulu untuk display/summary checkout.
  const totalBeforeUniqueCode = useMemo(() => {
    const backendTotal = orderSummary != null && orderSummary.total > 0 ? orderSummary.total : 0
    if (backendTotal > 0 && uniqueCode != null && uniqueCode >= 100 && uniqueCode <= 999 && backendTotal > uniqueCode) {
      return backendTotal - uniqueCode
    }
    return backendTotal > 0 ? backendTotal : expectedTotalFromCount
  }, [orderSummary, uniqueCode, expectedTotalFromCount])

  // Subtotal sebelum promo berdasarkan jumlah item kolektif.
  const subtotalBeforePromo = expectedTotalFromCount > 0 ? expectedTotalFromCount : (basePrice > 0 ? basePrice * purchaseCount : 0)
  // Potongan dari kode promo tampil jika backend mengembalikan total lebih kecil dari subtotal kolektif.
  const hasPromoDiscount = Boolean(
    promoCode.trim() &&
    orderSummary &&
    subtotalBeforePromo > 0 &&
    orderSummary.total > 0 &&
    orderSummary.total < subtotalBeforePromo
  )
  const promoDiscountAmount = hasPromoDiscount ? subtotalBeforePromo - orderSummary!.total : 0

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

  // Load program data berdasarkan slug
  useEffect(() => {
    if (!slug) {
      setCourse(null)
      setCheckoutId(null)
      setOrderSummary(null)
      setLoadingProgram(false)
      setStep('info')
      setUniqueCode(null)
      return
    }

    // Jika course di store sudah sesuai slug, pakai data itu
    if (course?.slug === slug) {
      // Pastikan step di-reset ke 'info' jika belum ada checkoutId (belum initiate)
      if (!useCheckoutStore.getState().checkoutId) {
        setStep('info')
      }
      setLoadingProgram(false)
      return
    }

    // Slug berubah → reset state checkout dan load ulang
    setCheckoutId(null)
    setOrderSummary(null)
    setStep('info')
    setUniqueCode(null)
    setError(null)
    setLoadingProgram(true)

    getPackageBySlug(slug)
      .then((pkg) => {
        setCourse(pkg ? packageToCourse(pkg) : null)
      })
      .catch(() => {
        setCourse(null)
        setError('Gagal memuat program.')
      })
      .finally(() => setLoadingProgram(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    if (!isGuruBuyer || !isCollectivePurchase) return
    let cancelled = false
    getInstructorProfile()
      .then((profile) => {
        if (cancelled) return
        const schoolId = String(profile.schoolId ?? profile.school_id ?? '').trim()
        setInstructorSchoolId(schoolId)
      })
      .catch(() => {
        if (cancelled) return
        setInstructorSchoolId('')
      })
    return () => {
      cancelled = true
    }
  }, [isGuruBuyer, isCollectivePurchase])

  const loadSchoolStudents = useCallback(async () => {
    if (!instructorSchoolId) {
      setSchoolStudentsError('School ID akun guru belum tersedia. Lengkapi profil guru dulu.')
      setSchoolStudentPool([])
      return
    }
    if (lastLoadedSchoolId === instructorSchoolId && schoolStudentPool.length > 0) {
      return
    }
    setLoadingSchoolStudents(true)
    setSchoolStudentsError(null)
    try {
      const rows = await getStudentsBySchool(instructorSchoolId)
      setSchoolStudentPool(rows)
      setLastLoadedSchoolId(instructorSchoolId)
      if (rows.length === 0) setSchoolStudentsError('Belum ada siswa di sekolah ini atau endpoint belum tersedia.')
    } catch (err) {
      setSchoolStudentPool([])
      setSchoolStudentsError(err instanceof ApiError ? err.message : 'Gagal memuat list siswa sekolah.')
    } finally {
      setLoadingSchoolStudents(false)
    }
  }, [instructorSchoolId, lastLoadedSchoolId, schoolStudentPool.length])

  useEffect(() => {
    if (!isGuruBuyer || !isCollectivePurchase || !instructorSchoolId) return
    if (lastLoadedSchoolId === instructorSchoolId && schoolStudentPool.length > 0) return
    loadSchoolStudents().catch(() => {})
  }, [
    instructorSchoolId,
    isCollectivePurchase,
    isGuruBuyer,
    lastLoadedSchoolId,
    loadSchoolStudents,
    schoolStudentPool.length,
  ])

  const updateCollectiveStudent = useCallback((id: string, field: 'name' | 'email', value: string) => {
    setCollectiveStudents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }, [])

  const addCollectiveStudent = useCallback(() => {
    setCollectiveStudents((prev) => [...prev, { id: crypto.randomUUID(), name: '', email: '' }])
  }, [])

  const removeCollectiveStudent = useCallback((id: string) => {
    setCollectiveStudents((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((item) => item.id !== id)
    })
  }, [])

  const mergeSelectedSchoolStudents = useCallback(() => {
    if (selectedSchoolStudentIds.length === 0) return
    const selected = schoolStudentPool.filter((item) => selectedSchoolStudentIds.includes(item.userId))
    setCollectiveStudents((prev) => {
      const map = new Map<string, CollectiveStudentItem>()
      for (const row of prev) {
        const key = row.email.trim().toLowerCase() || row.id
        map.set(key, row)
      }
      for (const row of selected) {
        const email = row.email.trim().toLowerCase()
        if (!email) continue
        if (!map.has(email)) {
          map.set(email, {
            id: crypto.randomUUID(),
            name: row.name,
            email: row.email,
            userId: row.userId,
          })
        }
      }
      return Array.from(map.values())
    })
  }, [schoolStudentPool, selectedSchoolStudentIds])

  const onContinue = useCallback(async () => {
    const currentCourse = useCheckoutStore.getState().course
    const currentUserInfo = useCheckoutStore.getState().userInfo

    if (!currentCourse) return
    if (!currentUserInfo.name.trim()) {
      setError('Nama harus diisi.')
      return
    }
    if (!currentUserInfo.email.trim() || !isValidEmail(currentUserInfo.email.trim())) {
      setError('Masukkan alamat email yang valid.')
      return
    }
    if (isGuruBuyer && isCollectivePurchase) {
      if (validCollectiveStudents.length === 0) {
        setError('Isi minimal 1 data siswa (nama + email valid) untuk pembelian kolektif.')
        return
      }
      const invalidRows = collectiveStudents.some(
        (item) => (item.name.trim() || item.email.trim()) && (!item.name.trim() || !isValidEmail(item.email.trim()))
      )
      if (invalidRows) {
        setError('Periksa kembali data siswa. Nama wajib dan email harus valid.')
        return
      }
    }

    setError(null)
    setLoadingContinue(true)

    // ── Harga untuk initiate: ambil langsung dari data integer course ──
    // Prioritas total: early bird -> price -> normal -> basePrice
    const unitExpectedRupiah = (
      (typeof currentCourse.priceEarlyBird === 'number' && currentCourse.priceEarlyBird > 0 ? currentCourse.priceEarlyBird : 0)
      || (typeof currentCourse.price === 'number' && currentCourse.price > 0 ? currentCourse.price : 0)
      || (typeof currentCourse.priceNormal === 'number' && currentCourse.priceNormal > 0 ? currentCourse.priceNormal : 0)
      || basePrice
    )
    const participantsCount = isGuruBuyer && isCollectivePurchase ? collectiveParticipantCount : 1
    const expectedTotalRupiah = unitExpectedRupiah > 0 ? unitExpectedRupiah * participantsCount : 0
    // Prioritas harga normal: normal -> price
    const unitNormalRupiah = (
      (typeof currentCourse.priceNormal === 'number' && currentCourse.priceNormal > 0 ? currentCourse.priceNormal : 0)
      || (typeof currentCourse.price === 'number' && currentCourse.price > 0 ? currentCourse.price : 0)
    )
    const normalPriceRupiah = unitNormalRupiah > 0 ? unitNormalRupiah * participantsCount : 0

    try {
      const currentPromoCode = useCheckoutStore.getState().promoCode.trim()
      const res = await initiateCheckout({
        programSlug: currentCourse.slug,
        programId: currentCourse.id,
        name: currentUserInfo.name.trim(),
        email: currentUserInfo.email.trim(),
        promoCode: currentPromoCode || '',
        expectedTotal: expectedTotalRupiah,
        normalPrice: normalPriceRupiah,
        buyerRole: isGuruBuyer ? 'guru' : 'student',
        roleHint: isGuruBuyer ? 'guru' : 'student',
        quantity: participantsCount,
        students:
          isGuruBuyer && isCollectivePurchase
            ? validCollectiveStudents.map((item) => ({
              name: item.name.trim(),
              email: item.email.trim(),
              userId: item.userId,
            }))
            : undefined,
      })

      setCheckoutId(res.checkoutId)

      // Utamakan total dari backend; fallback ke expectedTotal jika backend return 0
      const backendTotal = res.total > 0 ? res.total : 0
      const shouldPreserveCollectiveTotal =
        participantsCount > 1 &&
        expectedTotalRupiah > 0 &&
        !currentPromoCode &&
        backendTotal > 0 &&
        backendTotal < expectedTotalRupiah
      const effectiveTotal = shouldPreserveCollectiveTotal
        ? expectedTotalRupiah
        : (backendTotal || expectedTotalRupiah || expectedTotalFromCount)
      setOrderSummary({
        orderId: res.orderId,
        total: effectiveTotal,
        program: res.program
          ? {
            ...res.program,
            priceDisplay: res.priceDisplay || res.program.priceDisplay || (effectiveTotal > 0 ? `Rp${effectiveTotal.toLocaleString('id-ID')}` : res.program.priceDisplay),
          }
          : res.program,
      })

      // Jika backend mengirim confirmationCode, paksa integer lalu simpan sebagai uniqueCode
      const confirmationCodeInt = res.confirmationCode != null ? Math.trunc(Number(res.confirmationCode)) : NaN
      if (Number.isFinite(confirmationCodeInt) && confirmationCodeInt >= 100 && confirmationCodeInt <= 999) {
        setUniqueCode(confirmationCodeInt)
      }

      setStep('payment')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memulai checkout.')
    } finally {
      setLoadingContinue(false)
    }
  }, [
    basePrice,
    collectiveParticipantCount,
    collectiveStudents,
    expectedTotalFromCount,
    isCollectivePurchase,
    isGuruBuyer,
    setCheckoutId,
    setOrderSummary,
    setStep,
    setUniqueCode,
    validCollectiveStudents,
  ])

  const onPay = useCallback(async () => {
    const paymentOrderId = orderSummary?.orderId ?? checkoutId
    if (!paymentOrderId) return
    if (!paymentMethod) {
      setError('Pilih metode pembayaran terlebih dahulu.')
      return
    }

    setError(null)
    setLoadingPay(true)

    // Gunakan uniqueCode dari backend (confirmationCode) jika tersedia, else generate baru
    const code = uniqueCode ?? generateUniqueCode()
    const transferAmount = totalBeforeUniqueCode + code

    try {
      await createPaymentSession({
        orderId: paymentOrderId,
        checkoutId: checkoutId ?? undefined,
        paymentMethod,
        promoCode: promoCode.trim() || '',
        uniqueCode: code,
        amount: transferAmount,
      })
      setUniqueCode(code)
      if (!useAuthStore.getState().user) {
        setStep('set-password')
      } else {
        setStep('instructions')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membuat sesi pembayaran.')
    } finally {
      setLoadingPay(false)
    }
  }, [checkoutId, orderSummary?.orderId, totalBeforeUniqueCode, paymentMethod, promoCode, uniqueCode, setUniqueCode, setStep])

  const onSetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const currentInfo = useCheckoutStore.getState().userInfo

    if (!currentInfo.name.trim() || !currentInfo.email.trim()) {
      setSetPasswordError('Nama dan email harus diisi sebelum mengatur password.')
      return
    }
    if (newPassword.length < 6) {
      setSetPasswordError('Password minimal 6 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setSetPasswordError('Konfirmasi password tidak sama.')
      return
    }

    setSetPasswordError(null)
    setLoadingSetPassword(true)
    try {
      const res = await apiRegister({
        name: currentInfo.name.trim(),
        email: currentInfo.email.trim(),
        password: newPassword,
        role: 'student',
        slug: slug ?? undefined,
      })
      login(authUserFromApiResponse(res.user, res.token), res.token)
      setStep('instructions')
    } catch (err) {
      setSetPasswordError(err instanceof ApiError ? err.message : 'Gagal menyimpan password.')
    } finally {
      setLoadingSetPassword(false)
    }
  }, [newPassword, confirmPassword, login, setStep, slug])

  const onLeaveTransfer = () => {
    window.location.hash = user?.role === 'guru' ? '#/guru' : '#/student'
  }

  const onSubmitPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault()
    const orderId = orderSummary?.orderId
    if (!orderId) return
    if (!proofFile) {
      setProofError('Pilih file bukti transfer (gambar atau PDF).')
      return
    }
    setProofError(null)
    setLoadingProof(true)
    try {
      const transferAmount = totalBeforeUniqueCode + (uniqueCode ?? 0)
      const form = new FormData()
      form.append('proof', proofFile)
      form.append('amount', String(transferAmount))
      form.append('senderAccountNo', senderAccountNo.trim())
      form.append('senderName', senderName.trim())
      if (senderBank.trim()) form.append('senderBank', senderBank.trim())
      if (proofNote.trim()) form.append('note', proofNote.trim())
      await submitPaymentProof(orderId, form)
      window.location.hash = '#/checkout/success'
    } catch (err) {
      setProofError(err instanceof ApiError ? err.message : 'Gagal mengirim bukti pembayaran.')
    } finally {
      setLoadingProof(false)
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

  // Halaman instruksi transfer + slip setelah user klik Bayar & Daftar Program
  if (step === 'set-password') {
    return (
      <div className="min-h-screen flex flex-col">
        <LmsHeader />
        <main className="flex-1 py-10">
          <div className="max-w-lg mx-auto px-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Atur Password Akun</h1>
            <p className="text-gray-600 mb-6">
              Sebelum lanjut upload bukti transfer, silakan atur password untuk akun Anda terlebih dahulu.
            </p>

            <section className="border rounded-2xl p-6 bg-white">
              <form onSubmit={onSetPassword} className="space-y-4">
                {setPasswordError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{setPasswordError}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                  <input type="text" value={userInfo.name} readOnly className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-gray-50 text-gray-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={userInfo.email} readOnly className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-gray-50 text-gray-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password baru</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm"
                      placeholder="Minimal 6 karakter"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-primary"
                      aria-label={showNewPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showNewPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 5.09A9.77 9.77 0 0112 5c5 0 9 4 10 7-0.45 1.35-1.27 2.7-2.38 3.9M6.1 6.1C4.27 7.4 2.88 9.16 2 12c1 3 5 7 10 7 1.76 0 3.4-.5 4.83-1.35" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm"
                      placeholder="Ulangi password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-primary"
                      aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showConfirmPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 5.09A9.77 9.77 0 0112 5c5 0 9 4 10 7-0.45 1.35-1.27 2.7-2.38 3.9M6.1 6.1C4.27 7.4 2.88 9.16 2 12c1 3 5 7 10 7 1.76 0 3.4-.5 4.83-1.35" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loadingSetPassword}
                  className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50"
                >
                  {loadingSetPassword ? 'Menyimpan...' : 'Simpan Password & Lanjut Upload Bukti'}
                </button>
              </form>
            </section>
          </div>
        </main>
      </div>
    )
  }

  // Halaman instruksi transfer + slip setelah user klik Bayar & Daftar Program
  if (step === 'instructions') {
    const transferAmount = totalBeforeUniqueCode + (uniqueCode ?? 0)
    const transferAmountFormatted = `Rp${transferAmount.toLocaleString('id-ID')}`
    // Copy hanya nominal angka (tanpa "Rp") agar saat paste di bank/transfer yang terisi angka saja
    const transferAmountToCopy = String(transferAmount)

    return (
      <div className="min-h-screen flex flex-col">
        <LmsHeader />
        <main className="flex-1 py-10">
          <div className="max-w-2xl mx-auto px-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Transfer ke Rekening</h1>
            <p className="text-gray-600 mb-6">Lakukan pembayaran ke salah satu rekening di bawah ini dengan nominal yang tercantum (termasuk kode unik). Lalu simpan bukti transfer dan konfirmasi.</p>

            {uniqueCode != null && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-900">Kode unik untuk verifikasi</p>
                <p className="text-sm text-amber-800 mt-1">
                  Tambahkan <strong>3 digit kode unik ({uniqueCode})</strong> ke nominal pembayaran. Contoh: bila total Rp349.000, transfer menjadi <strong>Rp349.{String(uniqueCode).padStart(3, '0')}</strong>. Kode ini memudahkan tim kami memverifikasi pembayaran Anda.
                </p>
              </div>
            )}

            <section className="border rounded-2xl p-6 mb-6 bg-white">
              <h2 className="font-semibold text-gray-900 mb-4">Rekening Tujuan</h2>
              <div className="space-y-4">
                {BANK_ACCOUNTS.map((acc) => (
                  <div key={acc.bank} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-medium text-gray-900">{acc.bank}</p>
                    <p className="text-sm text-gray-600 mt-1 flex items-center flex-wrap gap-1">
                      Nomor Rekening: <span className="font-mono font-semibold">{acc.accountNo}</span>
                      <CopyButton text={acc.accountNo} label="nomor rekening" />
                    </p>
                    <p className="text-sm text-gray-600">Atas Nama: <span className="font-medium">{acc.accountName}</span></p>
                  </div>
                ))}
              </div>
            </section>

            <section className="border rounded-2xl p-6 mb-6 bg-slate-50">
              <h2 className="font-semibold text-gray-900 mb-4">Slip / Ringkasan Pembayaran</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Order ID</dt>
                  <dd className="font-mono font-medium">{orderSummary?.orderId ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Program</dt>
                  <dd className="font-medium">{course.title}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600">Nominal transfer (termasuk kode unik)</dt>
                  <dd className="font-bold text-lg text-primary inline-flex items-center">
                    {transferAmountFormatted}
                    <CopyButton text={transferAmountToCopy} label="nominal transfer" />
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-gray-500 mt-4">Transfer tepat sesuai nominal di atas. Setelah transfer, isi form di bawah dan upload bukti pembayaran.</p>
            </section>

            <section className="border rounded-2xl p-6 mb-6 bg-white">
              <h2 className="font-semibold text-gray-900 mb-1">Upload Bukti Pembayaran</h2>
              <p className="text-sm text-gray-600 mb-4">Transaksi ini berstatus <strong>Menunggu pembayaran</strong>. Isi data pengirim dan upload bukti transfer untuk konfirmasi.</p>

              <form onSubmit={onSubmitPaymentProof} className="space-y-4">
                {proofError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{proofError}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bukti transfer <span className="text-red-500">*</span></label>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => { setProofFile(e.target.files?.[0] ?? null); setProofError(null) }} className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:bg-gray-50 file:font-medium" />
                  <p className="text-xs text-gray-500 mt-1">Format: gambar (JPG, PNG) atau PDF. Maks. 5MB.</p>
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
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button type="button" onClick={onLeaveTransfer} className="flex-1 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50">
                    Keluar
                  </button>
                  <button type="submit" disabled={loadingProof || !proofFile} className="flex-1 py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50">
                    {loadingProof ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                  </button>
                </div>
              </form>
            </section>

            <p className="text-center text-sm text-gray-500">
              Belum transfer? Anda bisa upload bukti nanti dari halaman <a href={user?.role === 'guru' ? '#/guru/transactions' : '#/student/transactions'} className="text-primary font-medium hover:underline">Riwayat Transaksi</a>.
            </p>
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
                <div className="mt-2 space-y-0.5">
                  {course.priceNormal != null && course.priceNormal > 0 && (
                    <p className="text-sm text-gray-400 line-through">Harga normal: {formatRupiah(course.priceNormal)}</p>
                  )}
                  {(course.priceEarlyBird || course.price > 0) && (
                    <p className="text-primary font-bold">
                      {course.priceEarlyBird ? `Harga promo (Early bird): ${formatRupiah(course.priceEarlyBird)}` : formatRupiah(course.price)}
                    </p>
                  )}
                  {hasEarlyBirdDiscount && (
                    <p className="text-xs text-green-600 font-medium">Hemat Rp{earlyBirdDiscountAmount.toLocaleString('id-ID')}</p>
                  )}
                </div>
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
                  {isGuruBuyer && (
                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-3">
                      <label className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                        <input
                          type="checkbox"
                          checked={isCollectivePurchase}
                          onChange={(e) => setIsCollectivePurchase(e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary/30"
                        />
                        Pembelian kolektif untuk beberapa siswa
                      </label>
                      <p className="text-xs text-gray-500">
                        Aktifkan ini jika akun guru membeli 1 kelas untuk beberapa siswa sekaligus.
                      </p>
                    </div>
                  )}
                  {isGuruBuyer && isCollectivePurchase && (
                    <div className="rounded-xl border border-slate-200 p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">Daftar Siswa</h3>
                        <button
                          type="button"
                          onClick={addCollectiveStudent}
                          className="text-xs px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary/5"
                        >
                          + Tambah Siswa
                        </button>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 mb-3 bg-slate-50">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <button
                            type="button"
                            onClick={loadSchoolStudents}
                            disabled={loadingSchoolStudents || !instructorSchoolId}
                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-white disabled:opacity-50"
                          >
                            {loadingSchoolStudents ? 'Memuat siswa sekolah...' : 'Ambil dari list siswa 1 sekolah'}
                          </button>
                          {schoolStudentPool.length > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedSchoolStudentIds(schoolStudentPool.map((s) => s.userId))}
                                className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-white"
                              >
                                Pilih semua
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedSchoolStudentIds([])}
                                className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-white"
                              >
                                Reset pilih
                              </button>
                              <button
                                type="button"
                                onClick={mergeSelectedSchoolStudents}
                                className="text-xs px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary/5"
                              >
                                Tambahkan siswa terpilih
                              </button>
                            </>
                          )}
                        </div>
                        {schoolStudentsError && (
                          <p className="text-xs text-amber-700 mb-2">{schoolStudentsError}</p>
                        )}
                        {schoolStudentPool.length > 0 && (
                          <div className="max-h-40 overflow-auto rounded border bg-white p-2 space-y-1">
                            {schoolStudentPool.map((row) => {
                              const checked = selectedSchoolStudentIds.includes(row.userId)
                              return (
                                <label key={row.userId} className="flex items-center gap-2 text-xs text-gray-700 px-1 py-1 rounded hover:bg-slate-50">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const isChecked = e.target.checked
                                      setSelectedSchoolStudentIds((prev) =>
                                        isChecked ? [...prev, row.userId] : prev.filter((id) => id !== row.userId)
                                      )
                                    }}
                                  />
                                  <span className="font-medium">{row.name}</span>
                                  <span className="text-gray-500">({row.email})</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {collectiveStudents.map((item, idx) => (
                          <div key={item.id} className="grid md:grid-cols-12 gap-2 items-center">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateCollectiveStudent(item.id, 'name', e.target.value)}
                              placeholder={`Nama siswa #${idx + 1}`}
                              className="md:col-span-5 rounded-lg border px-3 py-2 text-sm"
                            />
                            <input
                              type="email"
                              value={item.email}
                              onChange={(e) => updateCollectiveStudent(item.id, 'email', e.target.value)}
                              placeholder={`Email siswa #${idx + 1}`}
                              className="md:col-span-6 rounded-lg border px-3 py-2 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => removeCollectiveStudent(item.id)}
                              disabled={collectiveStudents.length <= 1}
                              className="md:col-span-1 inline-flex items-center justify-center px-2 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                              title="Hapus siswa"
                              aria-label="Hapus siswa"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-5-3h4a1 1 0 011 1v2H9V5a1 1 0 011-1z" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        Jumlah siswa valid: <strong>{collectiveParticipantCount}</strong>
                      </p>
                    </div>
                  )}
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
                  {purchaseCount > 1 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Jumlah item (siswa)</span>
                      <span>{purchaseCount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Item program
                      {purchaseCount > 1 ? ` (${course.title} x ${purchaseCount})` : ''}
                    </span>
                    <span>{subtotalBeforePromo > 0 ? formatRupiah(subtotalBeforePromo) : '—'}</span>
                  </div>
                  {purchaseCount > 1 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Harga per item</span>
                    <span>{unitPromoPrice > 0 ? formatRupiah(unitPromoPrice) : '—'}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">{purchaseCount > 1 ? 'Harga normal (total)' : 'Harga normal'}</span>
                    <span>{expectedNormalTotalFromCount > 0 ? formatRupiah(expectedNormalTotalFromCount) : (expectedTotalFromCount > 0 ? formatRupiah(expectedTotalFromCount) : (orderSummary?.program?.priceDisplay || '—'))}</span>
                  </div>
                  {hasEarlyBirdDiscount && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Potongan harga (Early bird)</span>
                        <span className="text-green-600">- Rp{(earlyBirdDiscountAmount * purchaseCount).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{purchaseCount > 1 ? 'Harga promo (total)' : 'Harga promo (Early bird)'}</span>
                        <span>{expectedTotalFromCount > 0 ? formatRupiah(expectedTotalFromCount) : '—'}</span>
                      </div>
                    </>
                  )}
                  {hasPromoDiscount && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Potongan dari kode promo ({promoCode.trim()})</span>
                      <span className="text-green-600">- Rp{promoDiscountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Biaya layanan</span>
                    <span>Rp0</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold">
                    <span>Total</span>
                    <span>Rp{totalBeforeUniqueCode.toLocaleString('id-ID')}</span>
                  </div>
                </div>
                {step === 'payment' && (
                  <button
                    onClick={onPay}
                    disabled={loadingPay || !paymentMethod}
                    className="mt-6 w-full py-3.5 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
                  >
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

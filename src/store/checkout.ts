import { create } from 'zustand'
import type { Course } from '../types/course'

/** Data dari response POST /checkout/initiate (201) */
export interface CheckoutOrderSummary {
  orderId: string
  total: number
  program?: { title: string; priceDisplay: string }
}

interface CheckoutStore {
  course: Course | null
  checkoutId: string | null
  /** Diisi setelah initiate berhasil (orderId, total, program dari API) */
  orderSummary: CheckoutOrderSummary | null
  userInfo: { name: string; email: string }
  promoCode: string
  paymentMethod: 'bank_transfer' | null
  /** Step checkout saat ini */
  step: 'info' | 'payment' | 'instructions'
  /** Kode unik 3 digit untuk verifikasi transfer */
  uniqueCode: number | null
  setCourse: (c: Course | null) => void
  setCheckoutId: (id: string | null) => void
  setOrderSummary: (s: CheckoutOrderSummary | null) => void
  setUserInfo: (i: { name: string; email: string }) => void
  setPromoCode: (s: string) => void
  setPaymentMethod: (m: 'bank_transfer' | null) => void
  setStep: (s: 'info' | 'payment' | 'instructions') => void
  setUniqueCode: (c: number | null) => void
  reset: () => void
}

const init = {
  course: null,
  checkoutId: null,
  orderSummary: null,
  userInfo: { name: '', email: '' },
  promoCode: '',
  paymentMethod: null,
  step: 'info' as const,
  uniqueCode: null,
}

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  ...init,
  setCourse: (course) => set({ course }),
  setCheckoutId: (checkoutId) => set({ checkoutId }),
  setOrderSummary: (orderSummary) => set({ orderSummary }),
  setUserInfo: (userInfo) => set({ userInfo }),
  setPromoCode: (promoCode) => set({ promoCode }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setStep: (step) => set({ step }),
  setUniqueCode: (uniqueCode) => set({ uniqueCode }),
  reset: () => set(init),
}))

import { create } from 'zustand'
import type { Course } from '../types/course'

interface CheckoutStore {
  course: Course | null
  checkoutId: string | null
  userInfo: { name: string; email: string }
  promoCode: string
  paymentMethod: 'bank_transfer' | 'virtual_account' | 'ewallet' | null
  setCourse: (c: Course | null) => void
  setCheckoutId: (id: string | null) => void
  setUserInfo: (i: { name: string; email: string }) => void
  setPromoCode: (s: string) => void
  setPaymentMethod: (m: 'bank_transfer' | 'virtual_account' | 'ewallet' | null) => void
  reset: () => void
}

const init = { course: null, checkoutId: null, userInfo: { name: '', email: '' }, promoCode: '', paymentMethod: null }

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  ...init,
  setCourse: (course) => set({ course }),
  setCheckoutId: (checkoutId) => set({ checkoutId }),
  setUserInfo: (userInfo) => set({ userInfo }),
  setPromoCode: (promoCode) => set({ promoCode }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  reset: () => set(init),
}))

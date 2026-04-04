import { create } from 'zustand'
import type { LearningJourneyCourseDetailPayload } from '../lib/api'

/**
 * Cache ringkas detail journey per slug kursus (selaras My Courses / program.slug).
 * Di-refresh setelah POST complete; bisa di-merge dari server tanpa rewrite halaman lain.
 */
interface LearningJourneyStore {
  detailBySlug: Record<string, LearningJourneyCourseDetailPayload>
  setCourseDetail: (slug: string, detail: LearningJourneyCourseDetailPayload) => void
  clearCourseDetail: (slug: string) => void
}

export const useLearningJourneyStore = create<LearningJourneyStore>((set) => ({
  detailBySlug: {},
  setCourseDetail: (slug, detail) =>
    set((s) => ({ detailBySlug: { ...s.detailBySlug, [slug]: detail } })),
  clearCourseDetail: (slug) =>
    set((s) => {
      const next = { ...s.detailBySlug }
      delete next[slug]
      return { detailBySlug: next }
    }),
}))

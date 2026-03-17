import type { Course } from '../types/course'

export const MOCK_COURSES: Course[] = [
  {
    id: '1',
    slug: 'algoritma-dasar-cpp',
    title: 'Algoritma Dasar & C++ untuk Pemula',
    shortDescription: 'Mulai dari dasar sampai siap ikut tryout OSN.',
    thumbnail: '',
    price: 249000,
    priceEarlyBird: 249000,
    priceNormal: 399000,
    instructor: { id: '1', name: 'Tim Fansedu' },
    category: 'Programming',
    level: 'beginner',
    duration: '4 minggu',
    rating: 4.9,
    reviewCount: 128,
  },
  {
    id: '2',
    slug: 'osn-k-2026',
    title: 'Pelatihan Intensif OSN-K 2026',
    shortDescription: 'Strategi lolos OSN-K dengan tryout nasional.',
    thumbnail: '',
    price: 349000,
    priceEarlyBird: 349000,
    priceNormal: 500000,
    instructor: { id: '1', name: 'Tim Fansedu' },
    category: 'OSN',
    level: 'intermediate',
    duration: '4 minggu',
    rating: 4.8,
    reviewCount: 86,
  },
  {
    id: '3',
    slug: 'bundle-foundation-osnk',
    title: 'Bundle: Foundation + OSN-K 2026',
    shortDescription: 'Dapatkan kedua program sekaligus dengan harga hemat.',
    thumbnail: '',
    price: 549000,
    priceEarlyBird: 549000,
    priceNormal: 899000,
    instructor: { id: '1', name: 'Tim Fansedu' },
    category: 'Bundle',
    level: 'beginner',
    duration: '6 minggu',
    rating: 5,
    reviewCount: 42,
  },
]

export function getFeaturedCourses() {
  return MOCK_COURSES
}

export function getCourseBySlug(slug: string): (Course & { modules?: { id: string; title: string; lessons: { id: string; title: string; duration: string }[] }[]; reviews?: { id: string; user: string; rating: number; comment: string }[] }) | null {
  const c = MOCK_COURSES.find((x) => x.slug === slug)
  if (!c) return null
  return {
    ...c,
    modules: [
      { id: 'm1', title: 'Modul 1: Pengenalan', lessons: [{ id: 'l1', title: 'Apa itu OSN', duration: '15 min' }] },
      { id: 'm2', title: 'Modul 2: Algoritma', lessons: [{ id: 'l2', title: 'Variabel dan Loop', duration: '25 min' }] },
    ],
    reviews: [{ id: 'r1', user: 'Ahmad', rating: 5, comment: 'Materi jelas.', date: '2026-02-01' }],
  }
}

export function getProgramBySlug(slug: string) {
  return getCourseBySlug(slug)
}

export function getCourses(params?: { category?: string; search?: string; page?: number }) {
  let list = [...MOCK_COURSES]
  if (params?.category && params.category !== 'Semua') {
    list = list.filter((c) => c.category.toLowerCase() === params.category!.toLowerCase())
  }
  if (params?.search) {
    const q = params.search.toLowerCase()
    list = list.filter((c) => c.title.toLowerCase().includes(q))
  }
  const page = params?.page ?? 1
  const perPage = 6
  const start = (page - 1) * perPage
  return { data: list.slice(start, start + perPage), total: list.length, page, totalPages: Math.ceil(list.length / perPage) }
}

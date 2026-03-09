export interface Course {
  id: string
  slug: string
  title: string
  shortDescription: string
  thumbnail: string
  price: number
  priceDisplay: string
  instructor: { id: string; name: string; avatar?: string }
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  duration: string
  rating?: number
  reviewCount?: number
  modules?: CourseModule[]
  reviews?: Review[]
}

export interface CourseModule {
  id: string
  title: string
  lessons: { id: string; title: string; duration: string }[]
}

export interface Review {
  id: string
  user: string
  rating: number
  comment: string
  date: string
}

/**
 * Tipe artikel untuk list (card) — cocok dengan response API list
 */
export interface Article {
  id: string
  title: string
  excerpt: string
  image?: string
  slug: string
  publishedAt: string
  category?: string
}

/**
 * Tipe artikel lengkap untuk halaman detail — termasuk body/content dari backend
 */
export interface ArticleDetail extends Article {
  content: string
  updatedAt?: string
  author?: string
}

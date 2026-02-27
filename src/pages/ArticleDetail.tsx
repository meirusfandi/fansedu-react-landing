import { useEffect, useState } from 'react'
import '../App.css'
import type { ArticleDetail } from '../types/article'

const API_BASE = import.meta.env.VITE_ARTICLES_API_URL as string | undefined
const getDetailUrl = (slug: string) =>
  API_BASE ? `${API_BASE.replace(/\/$/, '')}/${slug}` : ''

interface Props {
  slug: string
}

export default function ArticleDetailPage({ slug }: Props) {
  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }
    const url = getDetailUrl(slug)
    if (url) {
      fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data: ArticleDetail) => {
          setArticle(data)
          setError(false)
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false))
    } else {
      // Fallback: mock detail dari slug (untuk development tanpa backend)
      const mock: ArticleDetail[] = [
        {
          id: '1',
          title: 'Tips Persiapan OSN Informatika 2026',
          excerpt: 'Langkah-langkah praktis mempersiapkan diri menghadapi OSN Informatika.',
          image: 'https://placehold.co/1200x480/161616/c9fd02?text=Tips+OSN',
          slug: 'tips-persiapan-osn-informatika-2026',
          publishedAt: '2026-02-20',
          category: 'Tips',
          content: `
            <p>Artikel ini berisi tips persiapan OSN Informatika 2026. Nanti konten penuh diambil dari backend (field <code>content</code>).</p>
            <p>Pastikan Anda menguasai dasar pemrograman, struktur data, dan algoritma. Ikuti tryout berkala dan biasakan dengan format soal OSN.</p>
            <h3>Langkah Persiapan</h3>
            <ul>
              <li>Pelajari materi dari sumber terpercaya</li>
              <li>Kerjakan soal-soal tahun sebelumnya</li>
              <li>Ikuti simulasi tryout</li>
              <li>Kelola waktu dan kesehatan</li>
            </ul>
          `,
          updatedAt: '2026-02-20',
          author: 'Tim Fansedu',
        },
        {
          id: '2',
          title: 'Materi Dasar Pemrograman untuk Pemula',
          excerpt: 'Pengenalan konsep pemrograman dan struktur data dasar.',
          image: 'https://placehold.co/1200x480/161616/c9fd02?text=Materi+Dasar',
          slug: 'materi-dasar-pemrograman-pemula',
          publishedAt: '2026-02-15',
          category: 'Materi',
          content: `
            <p>Materi dasar pemrograman sangat penting untuk OSN Informatika. Konten lengkap akan di-load dari API.</p>
            <p>Fokus pada: variabel, tipe data, percabangan, perulangan, fungsi, dan array.</p>
          `,
          updatedAt: '2026-02-15',
          author: 'Tim Fansedu',
        },
        {
          id: '3',
          title: 'Jadwal dan Tahapan OSN 2026',
          excerpt: 'Informasi lengkap tahapan seleksi OSN dari tingkat sekolah hingga nasional.',
          image: 'https://placehold.co/1200x480/161616/c9fd02?text=Jadwal+OSN',
          slug: 'jadwal-tahapan-osn-2026',
          publishedAt: '2026-02-10',
          category: 'Info',
          content: `
            <p>OSN 2026 terdiri dari beberapa tahap: tingkat sekolah, kabupaten/kota, provinsi, dan nasional.</p>
            <p>Simak informasi resmi dari Kemendikbud untuk jadwal pasti dan persyaratan.</p>
          `,
          updatedAt: '2026-02-10',
          author: 'Tim Fansedu',
        },
      ]
      const found = mock.find((a) => a.slug === slug)
      setArticle(found || null)
      setError(!found)
      setLoading(false)
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-[var(--fg-muted)]">Memuat artikel...</div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-6 px-4">
        <h1 className="font-display font-bold text-2xl text-[var(--fg)]">Artikel tidak ditemukan</h1>
        <a href="#/" className="btn-primary px-6 py-3 rounded-full font-semibold">
          Kembali ke Beranda
        </a>
      </div>
    )
  }

  const publishedDate = new Date(article.publishedAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a href="#/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center">
              <span className="font-display font-bold text-[var(--bg)] text-lg">F</span>
            </div>
            <span className="font-display font-semibold text-xl hidden sm:inline">Fansedu</span>
          </a>
          <a href="#/#articles" className="nav-link font-medium text-sm">
            ← Semua Artikel
          </a>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {article.category && (
          <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent)] text-[var(--bg)] text-xs font-semibold mb-4">
            {article.category}
          </span>
        )}
        <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-[var(--fg)] mb-4 leading-tight">
          {article.title}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-[var(--fg-muted)] mb-8">
          <time dateTime={article.publishedAt}>{publishedDate}</time>
          {article.author && <span>Oleh {article.author}</span>}
        </div>

        {article.image && (
          <div className="rounded-2xl overflow-hidden border border-[var(--border)] mb-10">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        <div
          className="article-content prose prose-invert max-w-none text-[var(--fg)]"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </article>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <a href="#/#articles" className="btn-secondary px-6 py-3 rounded-full font-semibold inline-block">
          ← Kembali ke Daftar Artikel
        </a>
      </div>
    </div>
  )
}

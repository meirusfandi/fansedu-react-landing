import { useEffect, useState } from 'react'
import './App.css'
import type { Article } from './types/article'

/** Paket / program yang sedang dibuka — dari GET /api/v1/packages atau mock */
export interface LandingPackage {
  id: string
  name: string
  slug: string
  shortDescription: string | null
  priceDisplay: string | null
  priceEarlyBird?: string | null
  priceNormal?: string | null
  ctaUrl: string | null
  ctaLabel: string
  isOpen: boolean
  /** Template pesan WA (jika dari API); frontend akan build link wa.me?text=... */
  waMessageTemplate?: string | null
  /** Materi yang dipelajari (atau poin value "Yang akan kamu kuasai") */
  materi?: string[]
  /** Fasilitas */
  fasilitas?: string[]
  /** Durasi program, e.g. "4 Minggu" */
  durasi?: string | null
  /** Paket gabungan (menandai bundle) */
  isBundle?: boolean
  /** Untuk bundle: subjudul mis. "Foundation + OSN Training" */
  bundleSubtitle?: string | null
  /** Bonus (untuk conversion) */
  bonus?: string[]
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080'
const PACKAGES_API_URL = `${API_BASE}/api/v1/packages`
const WA_NUMBER = '6285121277161'

/** Build link WhatsApp dengan template pesan terisi */
function waUrl(message: string): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`
}

/** Template pesan WA per section (bisa dipindah ke backend/site_settings nanti) */
const WA_TEMPLATES = {
  navbar: 'Halo Fansedu, saya ingin bertanya tentang program pelatihan.',
  hero: 'Halo Fansedu, saya tertarik mendaftar program pelatihan OSN Informatika.',
  tanyaProgram: 'Halo Fansedu, saya ingin bertanya tentang program dan pendaftaran.',
  requestBidang: 'Halo Fansedu, saya ingin request program bidang lainnya.',
  contact: 'Halo Fansedu, saya ingin bertanya lebih lanjut tentang program dan pendaftaran.',
  float: 'Halo Fansedu, saya ada pertanyaan.',
} as const

/** Link daftar akun di platform (LMS) */
const REGISTER_URL = 'https://app.fansedu.web.id/register'

/** Urgency: batch, kuota, deadline — ubah sesuai jadwal nyata */
const URGENCY = {
  batch: 'Batch April 2026',
  quotaMax: 30,
  /** Tenggat Early Bird: 10 hari dari sekarang. Countdown berkurang tiap hari (per hitungan hari). */
  earlyBirdEnd: new Date('2026-03-17T23:59:59+07:00'),
}
function getEarlyBirdDaysLeft(): number {
  const now = new Date()
  const end = URGENCY.earlyBirdEnd
  if (now >= end) return 0
  const diff = end.getTime() - now.getTime()
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)))
}

const MOCK_PACKAGES: LandingPackage[] = [
  {
    id: '1',
    name: 'Algorithm & Programming Foundation',
    slug: 'algorithm-programming-foundation',
    shortDescription: 'Kelas dasar untuk membangun fondasi berpikir algoritmik dan pemrograman yang dibutuhkan dalam kompetisi informatika.',
    priceDisplay: null,
    priceEarlyBird: 'Rp249.000',
    priceNormal: 'Rp399.000',
    ctaUrl: waUrl('Saya ingin bertanya detail terkait program Algorithm & Programming Foundation.'),
    ctaLabel: 'Daftar / Tanya',
    isOpen: true,
    durasi: '4 Minggu',
    materi: [
      'Menyelesaikan soal algoritma dasar',
      'Menggunakan C++ untuk kompetisi',
      'Teknik problem solving olimpiade',
      'Struktur data dasar',
    ],
    fasilitas: [
      '2x Live Class per minggu',
      'Latihan soal terstruktur',
      'Rekaman kelas (record class)',
      'Forum diskusi peserta',
    ],
  },
  {
    id: '2',
    name: 'Pelatihan Intensif OSN-K 2026 Informatika',
    slug: 'pelatihan-intensif-osn-k-2026',
    shortDescription: 'Program pelatihan khusus untuk membantu siswa mempersiapkan seleksi Olimpiade Sains Nasional bidang Informatika.',
    priceDisplay: null,
    priceEarlyBird: 'Rp349.000',
    priceNormal: 'Rp500.000',
    ctaUrl: waUrl('Saya ingin bertanya detail terkait program Pelatihan Intensif OSN-K 2026 Informatika.'),
    ctaLabel: 'Daftar / Tanya',
    isOpen: true,
    durasi: '4 Minggu',
    materi: [
      'Strategi lolos seleksi OSN tingkat sekolah & kabupaten',
      'Algoritma yang sering keluar di OSN',
      'Soal tipe olimpiade dengan pembahasan mendalam',
      'Problem solving & computational thinking terarah',
    ],
    fasilitas: [
      '2x Live Class per minggu',
      '2x Tryout Nasional',
      'Video pembahasan soal',
      'Dashboard ranking nasional peserta',
    ],
  },
  {
    id: '3',
    name: 'Kelas Gabungan (Foundation + OSN-K 2026)',
    slug: 'kelas-gabungan-foundation-osnk',
    shortDescription: 'Dapatkan kedua program sekaligus: fondasi algoritma & pemrograman plus persiapan intensif OSN-K. Lebih hemat daripada daftar terpisah.',
    priceDisplay: null,
    priceEarlyBird: 'Rp549.000',
    priceNormal: 'Rp899.000',
    ctaUrl: waUrl('Saya ingin bertanya detail terkait program Kelas Gabungan (Foundation + OSN-K 2026).'),
    ctaLabel: 'Daftar Kelas Gabungan',
    isOpen: true,
    isBundle: true,
    bundleSubtitle: 'Foundation + OSN Training',
    durasi: '6 Minggu',
    bonus: ['Bank soal OSN', 'Rekaman kelas', 'Grup diskusi'],
    materi: [
      'Semua keahlian Foundation + OSN-K dalam satu paket',
      'Dari dasar C++ sampai siap menghadapi OSN-K',
      'Akses penuh ke latihan, tryout, dan pembahasan',
      'Lebih hemat, lebih lengkap',
    ],
    fasilitas: [
      '2x Live Class per minggu (gabungan kedua program)',
      'Latihan soal terstruktur + 2x Tryout Nasional',
      'Rekaman kelas + video pembahasan soal',
      'Forum diskusi & dashboard ranking nasional',
    ],
  },
]

const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@fansedu.official'
// Set to first video ID from channel to show its thumbnail; or use VITE_HERO_YOUTUBE_VIDEO_ID in .env
const YOUTUBE_VIDEO_ID_PLACEHOLDER = (import.meta.env.VITE_HERO_YOUTUBE_VIDEO_ID as string) || ''

// Placeholder artikel; nanti diganti dengan fetch dari backend (mis. GET /api/articles)
const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Tips Persiapan OSN Informatika 2026',
    excerpt: 'Langkah-langkah praktis mempersiapkan diri menghadapi OSN Informatika dari persiapan materi hingga manajemen waktu.',
    image: 'https://placehold.co/600x320/161616/c9fd02?text=Tips+OSN',
    slug: 'tips-persiapan-osn-informatika-2026',
    publishedAt: '2026-02-20',
    category: 'Tips',
  },
  {
    id: '2',
    title: 'Materi Dasar Pemrograman untuk Pemula',
    excerpt: 'Pengenalan konsep pemrograman dan struktur data dasar yang sering muncul di soal OSN Informatika.',
    image: 'https://placehold.co/600x320/161616/c9fd02?text=Materi+Dasar',
    slug: 'materi-dasar-pemrograman-pemula',
    publishedAt: '2026-02-15',
    category: 'Materi',
  },
  {
    id: '3',
    title: 'Jadwal dan Tahapan OSN 2026',
    excerpt: 'Informasi lengkap tahapan seleksi OSN dari tingkat sekolah hingga nasional serta timeline penting.',
    image: 'https://placehold.co/600x320/161616/c9fd02?text=Jadwal+OSN',
    slug: 'jadwal-tahapan-osn-2026',
    publishedAt: '2026-02-10',
    category: 'Info',
  },
]

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [navbarSolid, setNavbarSolid] = useState(false)
  const [heroVideoId, setHeroVideoId] = useState<string>(YOUTUBE_VIDEO_ID_PLACEHOLDER)
  // Artikel: diisi dari backend bila VITE_ARTICLES_API_URL diset
  const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES)
  // Paket / program: diisi dari backend GET /api/v1/packages (hanya is_open = true)
  const [packages, setPackages] = useState<LandingPackage[]>(MOCK_PACKAGES)
  useEffect(() => {
    const api = import.meta.env.VITE_ARTICLES_API_URL as string | undefined
    if (!api) return
    fetch(api)
      .then((r) => r.json())
      .then((data: Article[]) => setArticles(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])
  useEffect(() => {
    fetch(PACKAGES_API_URL)
      .then((r) => r.json())
      .then((data: unknown) => {
        const arr = Array.isArray(data) ? data : (data && typeof data === 'object' && 'data' in data) ? (data as { data: unknown }).data : null
        if (!Array.isArray(arr)) return
        const list = (arr as Record<string, unknown>[]).filter((p) => p.is_open !== false).map((p) => ({
          id: String(p.id ?? ''),
          name: String(p.name ?? p.title ?? ''),
          slug: String(p.slug ?? ''),
          shortDescription: p.short_description != null ? String(p.short_description) : null,
          priceDisplay: p.price_display != null ? String(p.price_display) : null,
          priceEarlyBird: p.price_early_bird != null ? String(p.price_early_bird) : null,
          priceNormal: p.price_normal != null ? String(p.price_normal) : null,
          ctaUrl: p.wa_message_template ? waUrl(String(p.wa_message_template)) : (p.cta_url != null ? String(p.cta_url) : null),
          ctaLabel: String(p.cta_label ?? 'Daftar'),
          isOpen: p.is_open !== false,
          waMessageTemplate: p.wa_message_template != null ? String(p.wa_message_template) : null,
          durasi: p.durasi != null ? String(p.durasi) : null,
          materi: Array.isArray(p.materi) ? (p.materi as string[]) : (typeof p.materi === 'string' ? (() => { try { const parsed = JSON.parse(p.materi as string); return Array.isArray(parsed) ? parsed : undefined; } catch { return undefined; } })() : undefined),
          fasilitas: Array.isArray(p.fasilitas) ? (p.fasilitas as string[]) : (typeof p.fasilitas === 'string' ? (() => { try { const parsed = JSON.parse(p.fasilitas as string); return Array.isArray(parsed) ? parsed : undefined; } catch { return undefined; } })() : undefined),
          isBundle: p.is_bundle === true,
          bundleSubtitle: p.bundle_subtitle != null ? String(p.bundle_subtitle) : null,
          bonus: Array.isArray(p.bonus) ? (p.bonus as string[]) : (typeof p.bonus === 'string' ? (() => { try { const parsed = JSON.parse(p.bonus as string); return Array.isArray(parsed) ? parsed : undefined; } catch { return undefined; } })() : undefined),
        }))
        setPackages(list)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active')
          }
        })
      },
      { root: null, rootMargin: '0px', threshold: 0.1 },
    )

    revealElements.forEach((element) => observer.observe(element))

    return () => {
      revealElements.forEach((element) => observer.unobserve(element))
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
      }
    }

    const onScroll = () => {
      setNavbarSolid(window.scrollY > 50)
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll)

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Fetch channel page to get first video ID for hero thumbnail (CORS proxy)
  useEffect(() => {
    if (YOUTUBE_VIDEO_ID_PLACEHOLDER) return
    const controller = new AbortController()
    const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(`${YOUTUBE_CHANNEL_URL}/videos`)}`
    fetch(url, { signal: controller.signal })
      .then((res) => res.text())
      .then((html) => {
        // Try ytInitialData first (videoId in gridVideoRenderer or richItemRenderer)
        const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
        if (videoIdMatch?.[1]) {
          setHeroVideoId(videoIdMatch[1])
          return
        }
        // Fallback: first /watch?v= link
        const watchMatch = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/)
        if (watchMatch?.[1]) setHeroVideoId(watchMatch[1])
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const handleAnchorClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return
    event.preventDefault()
    const target = document.querySelector(href)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setIsMenuOpen(false)
    }
  }

  return (
    <div className="wrapper pb-20 md:pb-0">
      <header className={`navbar fixed top-0 left-0 right-0 z-50 ${navbarSolid ? 'navbar-solid' : ''}`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <a href="#hero" className="flex items-center gap-3" onClick={(event) => handleAnchorClick(event, '#hero')}>
              <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-white text-lg">F</span>
              </div>
              <span className="font-display font-semibold text-xl hidden sm:block">Fansedu</span>
            </a>

            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-8">
                <a href="#solusi" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#solusi')}>
                  Tentang Kami
                </a>
                <a href="#masalah" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#masalah')}>
                  Tantangan
                </a>
                <a href="#features" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#features')}>
                  Fitur
                </a>
                <a href="#packages" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#packages')}>
                  Program
                </a>
                <a href="#testimoni" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#testimoni')}>
                  Testimoni
                </a>
                <a href="#tryout" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#tryout')}>
                  TryOut Gratis
                </a>
                <a href="#request" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#request')}>
                  Request Bidang
                </a>
                <a href="#contact" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#contact')}>
                  Kontak
                </a>
              </nav>
              <a
                href={waUrl(WA_TEMPLATES.navbar)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary px-6 py-3 rounded-full font-semibold text-sm inline-block"
              >
                Hubungi Kami
              </a>
            </div>

            <button
              className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5"
              aria-label="Toggle menu"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              <span className={`w-6 h-0.5 bg-white transition-all ${isMenuOpen ? 'bar-open-1' : ''}`}></span>
              <span className={`w-6 h-0.5 bg-white transition-all ${isMenuOpen ? 'bar-open-2' : ''}`}></span>
              <span className={`w-6 h-0.5 bg-white transition-all ${isMenuOpen ? 'bar-open-3' : ''}`}></span>
            </button>
          </div>
        </nav>
      </header>

      <div className={`mobile-menu fixed top-0 right-0 w-80 h-full bg-[var(--bg)] z-40 border-l border-[var(--border)] ${isMenuOpen ? 'active' : ''}`}>
        <div className="pt-24 px-6">
          <nav className="flex flex-col gap-4">
            <a href="#solusi" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#solusi')}>
              Tentang Kami
            </a>
            <a href="#masalah" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#masalah')}>
              Tantangan
            </a>
            <a href="#features" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#features')}>
              Fitur
            </a>
            <a href="#packages" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#packages')}>
              Program
            </a>
            <a href="#testimoni" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#testimoni')}>
              Testimoni
            </a>
            <a href="#tryout" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#tryout')}>
              TryOut Gratis
            </a>
            <a href="#request" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#request')}>
              Request Bidang
            </a>
            <a href="#contact" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#contact')}>
              Kontak
            </a>
          </nav>
          <div className="mt-8">
            <a href={waUrl(WA_TEMPLATES.navbar)} target="_blank" rel="noreferrer" className="btn-primary px-6 py-4 rounded-full font-semibold text-center block">
              Hubungi Kami
            </a>
          </div>
        </div>
      </div>

      <section id="hero" className="relative min-h-screen flex items-center grid-bg overflow-hidden">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="reveal">
                <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6">
                  Program Persiapan OSN Informatika 2026
                </span>
              </div>

              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight mb-4 reveal reveal-delay-1">
                Persiapan OSN Informatika 2026
              </h1>
              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl leading-tight mb-6 text-[var(--accent)] reveal reveal-delay-1">
                Mulai dari Dasar sampai Lolos OSN-K
              </h2>

              <p className="text-lg text-[var(--fg-muted)] mb-6 max-w-xl reveal reveal-delay-2">
                Belajar algoritma, C++, dan strategi olimpiade melalui latihan soal, tryout nasional, dan pembahasan mendalam.
              </p>

              <ul className="space-y-2 mb-8 reveal reveal-delay-2">
                <li className="flex items-center gap-2 text-[var(--fg)]">
                  <span className="text-[var(--accent)] font-bold">✔</span> Mentor berpengalaman
                </li>
                <li className="flex items-center gap-2 text-[var(--fg)]">
                  <span className="text-[var(--accent)] font-bold">✔</span> 2x Tryout Nasional
                </li>
                <li className="flex items-center gap-2 text-[var(--fg)]">
                  <span className="text-[var(--accent)] font-bold">✔</span> Dashboard Ranking
                </li>
              </ul>

              <div className="flex flex-wrap items-center gap-3 mb-12 reveal reveal-delay-3">
                <a href={REGISTER_URL} target="_blank" rel="noreferrer" className="btn-primary px-6 py-2.5 rounded-full font-semibold text-sm text-center">
                  Daftar Sekarang
                </a>
                <a href={waUrl(WA_TEMPLATES.tanyaProgram)} target="_blank" rel="noreferrer" className="btn-secondary px-6 py-2.5 rounded-full font-semibold text-sm text-center">
                  Tanya Program
                </a>
                <a href="#solusi" className="text-[var(--fg-muted)] hover:text-[var(--accent)] font-medium text-sm transition-colors" onClick={(event) => handleAnchorClick(event, '#solusi')}>
                  Pelajari Lebih Lanjut →
                </a>
              </div>

            </div>

            <div className="order-1 lg:order-2 reveal">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] to-transparent opacity-20 rounded-3xl blur-3xl"></div>
                <div className="relative bg-[var(--card)] rounded-3xl border border-[var(--border)] overflow-hidden">
                  <a
                    href={heroVideoId ? `https://www.youtube.com/watch?v=${heroVideoId}` : YOUTUBE_CHANNEL_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block w-full"
                  >
                    {heroVideoId ? (
                      <img
                        src={`https://img.youtube.com/vi/${heroVideoId}/maxresdefault.jpg`}
                        alt="Video Pembelajaran Fansedu - OSN Informatika"
                        className="w-full h-auto object-cover"
                        onError={(e) => {
                          const target = e.currentTarget
                          if (!target.src.includes('hqdefault')) {
                            target.src = `https://img.youtube.com/vi/${heroVideoId}/hqdefault.jpg`
                          } else {
                            target.src = 'https://placehold.co/600x500/161616/c9fd02?text=Video+Pembelajaran'
                            target.onerror = null
                          }
                        }}
                      />
                    ) : (
                      <img
                        src="https://placehold.co/600x500/161616/c9fd02?text=Video+Pembelajaran"
                        alt="Fansedu Informatic Olympiad Training"
                        className="w-full h-auto"
                      />
                    )}
                  </a>

                  <a
                    href="https://www.youtube.com/@fansedu.official"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="absolute bottom-4 left-4 right-4 bg-[var(--bg)] bg-opacity-90 backdrop-blur-lg rounded-2xl p-4 border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                  >
                    <div className="flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">Video Pembelajaran</div>
                        <div className="text-xs text-[var(--fg-muted)]">Tonton di YouTube @fansedu.official</div>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 scroll-indicator">
          <div className="w-6 h-10 rounded-full border-2 border-[var(--border)] flex justify-center pt-2">
            <div className="w-1.5 h-3 rounded-full bg-[var(--accent)]"></div>
          </div>
        </div>
      </section>

      <section id="social-proof" className="py-16 relative bg-[var(--card)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '20+', label: 'paket pembahasan soal' },
              { value: '2x', label: 'Tryout nasional per batch' },
              { value: '100%', label: 'Pembahasan mendalam' },
              { value: 'sejak 2014', label: 'Pengalaman bimbingan OSN' },
            ].map((item) => (
              <div key={item.label} className="reveal">
                <div className="font-display font-bold text-3xl sm:text-4xl text-[var(--accent)] mb-1">{item.value}</div>
                <div className="text-sm text-[var(--fg-muted)]">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="masalah" className="py-24 relative bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">Yang Sering Dihadapi</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
              Masalah Siswa <span className="text-[var(--accent)]">Persiapan OSN</span>
            </h2>
            <p className="text-[var(--fg-muted)] text-lg reveal reveal-delay-2">
              Banyak siswa dan guru pembimbing menghadapi kendala yang sama saat mempersiapkan OSN Informatika.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Bingung mulai dari mana', desc: 'Materi OSN luas, tidak tahu prioritas dan urutan belajar yang efektif.' },
              { title: 'Materi tidak terstruktur', desc: 'Belajar dari banyak sumber tanpa kurikulum jelas dan pembahasan mendalam.' },
              { title: 'Tidak ada simulasi nyata', desc: 'Belum pernah mengerjakan soal format OSN dengan batas waktu dan ranking.' },
              { title: 'Kurang bimbingan ahli', desc: 'Sulit menemukan mentor yang benar-benar berpengalaman di jalur OSN.' },
              { title: 'Tidak tahu posisi kemampuan', desc: 'Tidak ada alat ukur untuk bandingkan dengan peserta lain secara nasional.' },
              { title: 'Waktu terbatas', desc: 'Perlu metode belajar yang efisien dan terarah agar siap tepat waktu.' },
            ].map((item, index) => (
              <div key={item.title} className={`feature-card rounded-2xl p-6 reveal reveal-delay-${(index % 3) + 1}`}>
                <div className="w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center mb-4 text-[var(--fg-muted)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-[var(--fg-muted)] text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solusi" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal">
                <div className="feature-card rounded-3xl p-8 lg:p-12 h-full flex flex-col items-center justify-center text-center">
                  <img src="/fansedu.png" alt="Fansedu logo" className="w-40 sm:w-48 rounded-2xl mb-6" />
                  <h2 className="font-display font-bold text-2xl lg:text-3xl">Solusi FansEdu</h2>
                </div>
            </div>

            <div>
              <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">
                Solusi Kami
              </span>

              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
                Dari <span className="text-[var(--accent)]">Masalah</span> ke Lolos OSN-K
              </h2>

              <p className="text-[var(--fg-muted)] text-lg mb-6 reveal reveal-delay-2">
                Fansedu hadir sebagai solusi bagi siswa SMA dan guru pembimbing yang ingin persiapan OSN Informatika terstruktur: kurikulum dari dasar sampai siap lomba, tryout nasional untuk simulasi nyata, dan pembahasan mendalam oleh mentor berpengalaman.
              </p>

              <p className="text-[var(--fg-muted)] mb-8 reveal reveal-delay-3">
                Tim pengajar berasal dari <strong className="text-[var(--fg)]">Ex-OSN Informatika</strong>, <strong className="text-[var(--fg)]">Ex-Tokopedia</strong>, <strong className="text-[var(--fg)]">Govtech Indonesia</strong>, dan praktisi software engineer. Materi dan strategi disesuaikan khusus untuk persiapan OSN.
              </p>

              <div className="grid grid-cols-2 gap-6 reveal reveal-delay-4">
                {['Kurikulum terstruktur', 'Tryout nasional', 'Pembahasan mendalam', 'Mentor berpengalaman', 'Dashboard ranking', 'Rekaman & arsip lengkap'].map((item) => (
                  <div className="flex items-center gap-3" key={item}>
                    <div className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Visual proof: screenshot leaderboard, dashboard, soal */}
          <div className="mt-20 pt-16 border-t border-[var(--border)]">
            <h3 className="text-center font-display font-bold text-2xl sm:text-3xl text-[var(--fg)] mb-10 reveal">Lihat Sendiri Pengalaman Belajar</h3>
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              <div className="reveal">
                <div className="feature-card rounded-2xl overflow-hidden border-2 border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors">
                  <div className="aspect-video bg-[var(--bg-secondary)] relative">
                    <img
                      src="/leaderboard-to.png"
                      alt="Screenshot leaderboard ranking nasional Fansedu"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        const t = e.currentTarget
                        if (!t.src.includes('placehold.co')) {
                          t.src = 'https://placehold.co/800x450/1e293b/c9fd02?text=Leaderboard+Nasional'
                        }
                      }}
                    />
                  </div>
                  <div className="p-4 text-center">
                    <p className="font-semibold text-[var(--fg)]">Leaderboard Nasional</p>
                    <p className="text-sm text-[var(--fg-muted)]">Peringkat tryout antar peserta</p>
                  </div>
                </div>
              </div>
              <div className="reveal reveal-delay-1">
                <div className="feature-card rounded-2xl overflow-hidden border-2 border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors">
                  <div className="aspect-video bg-[var(--bg-secondary)] relative">
                    <img
                      src="/dashboard-siswa.png"
                      alt="Screenshot dashboard peserta Fansedu"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        const t = e.currentTarget
                        if (!t.src.includes('placehold.co')) {
                          t.src = 'https://placehold.co/800x450/1e293b/c9fd02?text=Dashboard+Peserta'
                        }
                      }}
                    />
                  </div>
                  <div className="p-4 text-center">
                    <p className="font-semibold text-[var(--fg)]">Dashboard Peserta</p>
                    <p className="text-sm text-[var(--fg-muted)]">Progress dan akses materi</p>
                  </div>
                </div>
              </div>
              <div className="reveal reveal-delay-2">
                <div className="feature-card rounded-2xl overflow-hidden border-2 border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors">
                  <div className="aspect-video bg-[var(--bg-secondary)] relative">
                    <img
                      src="/kelas-osn.png"
                      alt="Screenshot kelas dan materi OSN Fansedu"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        const t = e.currentTarget
                        if (!t.src.includes('placehold.co')) {
                          t.src = 'https://placehold.co/800x450/1e293b/c9fd02?text=Kelas+OSN'
                        }
                      }}
                    />
                  </div>
                  <div className="p-4 text-center">
                    <p className="font-semibold text-[var(--fg)]">Kelas</p>
                    <p className="text-sm text-[var(--fg-muted)]">Sesi belajar dan materi OSN</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 relative bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">Fitur Program</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
              Fitur Program <span className="text-[var(--accent)]">FansEdu</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {[
              ['Pembahasan solusi optimal seperti di OSN', 'Pembahasan algoritma langkah demi langkah dan solusi optimal ala soal OSN, bukan sekadar jawaban singkat.'],
              ['Akses materi & rekaman kapan saja', 'Fleksibilitas penuh mengakses materi, rekaman kelas, dan pembahasan sesuai jadwal kamu.'],
              ['Kurikulum dari praktisi & alumni OSN', 'Materi disusun oleh praktisi dan alumni OSN berpengalaman, fokus ke yang sering keluar di lomba.'],
              ['Mentor medalis & pelatih OSN', 'Tim pengajar terdiri dari medalis dan pelatih OSN yang paham strategi lolos seleksi.'],
              ['Rekaman kelas & pembahasan tanpa batas', 'Akses semua rekaman live class dan video pembahasan soal tanpa batas waktu.'],
              ['Investasi tepat untuk persiapan OSN', 'Nilai terbaik untuk hasil maksimal: dari dasar sampai siap menghadapi OSN-K.'],
            ].map(([title, desc], index) => (
              <div key={title} className={`feature-card rounded-2xl p-6 flex gap-5 reveal reveal-delay-${(index % 4) + 1}`}>
                <div className="feature-icon w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
                  <p className="text-[var(--fg-muted)] text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="packages" className="py-24 relative bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">Program</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
              Program <span className="text-[var(--accent)]">yang Sedang Dibuka</span>
            </h2>
            <p className="text-[var(--fg-muted)] text-lg reveal reveal-delay-2">
              Pilih program yang sesuai dengan kebutuhan persiapan OSN Informatika Anda.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.filter((p) => p.isOpen).map((pkg, index) => {
              const isBundle = pkg.isBundle === true
              const normalNum = isBundle && pkg.priceNormal ? parseInt(pkg.priceNormal.replace(/\D/g, ''), 10) : 0
              const earlyNum = isBundle && pkg.priceEarlyBird ? parseInt(pkg.priceEarlyBird.replace(/\D/g, ''), 10) : 0
              const hematRupiah = normalNum > 0 && earlyNum > 0 && normalNum > earlyNum
                ? `Rp${((normalNum - earlyNum) / 1000).toFixed(0)}.000`
                : null
              return (
              <div key={pkg.id} className={`feature-card rounded-2xl p-8 flex flex-col reveal reveal-delay-${(index % 3) + 1} ${isBundle ? 'ring-2 ring-[var(--accent)] border-[var(--accent)]' : ''}`}>
                {isBundle ? (
                  <>
                    <div className="mb-4">
                      <span className="inline-block px-3 py-1.5 rounded-full bg-[var(--accent)] text-white text-sm font-semibold mb-2">
                        🔥 Paket Hemat
                      </span>
                      {pkg.bundleSubtitle && (
                        <h3 className="font-display font-semibold text-xl text-[var(--fg)]">{pkg.bundleSubtitle}</h3>
                      )}
                    </div>
                  </>
                ) : (
                  <h3 className="font-display font-semibold text-xl mb-2">{pkg.name}</h3>
                )}
                {!isBundle && pkg.shortDescription && (
                  <p className="text-[var(--fg-muted)] text-sm mb-4">{pkg.shortDescription}</p>
                )}
                {isBundle && pkg.shortDescription && (
                  <p className="text-[var(--fg-muted)] text-sm mb-4">{pkg.shortDescription}</p>
                )}
                {pkg.bonus && pkg.bonus.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-[var(--fg)] text-xs uppercase tracking-wide mb-2">Bonus</p>
                    <ul className="text-[var(--fg-muted)] text-sm space-y-1.5">
                      {pkg.bonus.map((b, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-[var(--accent)] font-bold">✔</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pkg.materi && pkg.materi.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-[var(--fg)] text-xs uppercase tracking-wide mb-2">Yang akan kamu kuasai</p>
                    <ul className="text-[var(--fg-muted)] text-sm space-y-1.5">
                      {pkg.materi.map((m, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[var(--accent)] font-bold shrink-0">✔</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pkg.fasilitas && pkg.fasilitas.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-[var(--fg)] text-xs uppercase tracking-wide mb-2">Fasilitas</p>
                    <ul className="text-[var(--fg-muted)] text-sm space-y-1 list-disc list-inside">
                      {pkg.fasilitas.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {pkg.durasi && (
                  <p className="text-sm text-[var(--fg-muted)] mb-2">
                    <span className="font-semibold text-[var(--fg)]">Durasi:</span> {pkg.durasi}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-4 py-3 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <span className="text-xs font-medium text-[var(--fg-muted)]">{URGENCY.batch}</span>
                  <span className="text-[var(--fg-muted)]">·</span>
                  <span className="text-xs font-semibold text-[var(--fg)]">Kuota {URGENCY.quotaMax} siswa</span>
                  {getEarlyBirdDaysLeft() > 0 && (
                    <>
                      <span className="text-[var(--fg-muted)]">·</span>
                      <span className="text-xs font-semibold text-[var(--accent)]">Early Bird {getEarlyBirdDaysLeft()} hari lagi</span>
                    </>
                  )}
                </div>
                <div className="mt-auto pt-4 border-t border-[var(--border)]">
                  {(pkg.priceEarlyBird != null || pkg.priceNormal != null || pkg.priceDisplay) && (
                    <div className="mb-4">
                      {isBundle ? (
                        <>
                          <p className="font-semibold text-[var(--fg)] text-xs uppercase tracking-wide mb-1">Harga</p>
                          {pkg.priceNormal != null && (
                            <p className="text-sm text-[var(--fg-muted)] line-through mb-0.5">Normal: {pkg.priceNormal}</p>
                          )}
                          {pkg.priceEarlyBird != null && (
                            <p className="text-lg font-bold text-[var(--accent)]">Early Bird: {pkg.priceEarlyBird}</p>
                          )}
                          {hematRupiah && (
                            <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">Hemat {hematRupiah}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-[var(--fg)] text-xs uppercase tracking-wide mb-1">Harga</p>
                          {pkg.priceEarlyBird != null && (
                            <p className="text-sm text-[var(--fg-muted)]">Early Bird: <span className="font-semibold text-[var(--accent)]">{pkg.priceEarlyBird}</span></p>
                          )}
                          {pkg.priceNormal != null && (
                            <p className="text-sm text-[var(--fg-muted)]">Harga Normal: <span className="font-semibold text-[var(--accent)]">{pkg.priceNormal}</span></p>
                          )}
                          {pkg.priceDisplay != null && !pkg.priceEarlyBird && !pkg.priceNormal && (
                            <p className="font-semibold text-[var(--accent)]">{pkg.priceDisplay}</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {pkg.ctaUrl && (
                    <div className="flex flex-col gap-2">
                      <a
                        href={REGISTER_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary px-6 py-3 rounded-full font-semibold text-center inline-block text-sm w-full"
                      >
                        Daftar Sekarang
                      </a>
                      <a
                        href={pkg.ctaUrl.startsWith('http') ? pkg.ctaUrl : pkg.ctaUrl}
                        target={pkg.ctaUrl.startsWith('http') ? '_blank' : undefined}
                        rel={pkg.ctaUrl.startsWith('http') ? 'noreferrer' : undefined}
                        className="btn-secondary px-6 py-3 rounded-full font-semibold text-center inline-block text-sm w-full border border-[var(--border)]"
                      >
                        Tanya Program
                      </a>
                    </div>
                  )}
                </div>
              </div>
              )
            })}
          </div>

          {packages.filter((p) => p.isOpen).length === 0 && (
            <p className="text-center text-[var(--fg-muted)] py-8">Belum ada program yang dibuka saat ini. Hubungi kami untuk informasi terbaru.</p>
          )}
        </div>
      </section>

      <section id="testimoni" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">Testimoni</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
              Apa Kata <span className="text-[var(--accent)]">Mereka?</span>
            </h2>
            <p className="text-[var(--fg-muted)] text-lg reveal reveal-delay-2">
              Pengalaman peserta dan guru pembimbing yang telah bergabung dengan program FansEdu.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { quote: 'Materi terstruktur dari dasar, jadi tidak bingung lagi mau mulai dari mana. Tryout-nya juga bikin saya tahu posisi saya di antara peserta lain.', author: 'Siswa SMA', role: 'Peserta Foundation' },
              { quote: 'Pembahasan soalnya mendalam dan mentor responsif. Saya rekomendasikan untuk yang serius mau persiapan OSN.', author: 'Guru Pembimbing', role: 'OSN Informatika' },
              { quote: 'Dari tidak bisa C++ sama sekali sampai bisa ikut tryout dan lihat ranking. Program ini worth it.', author: 'Siswa SMA', role: 'Peserta OSN-K' },
            ].map((item, index) => (
              <div key={index} className={`feature-card rounded-2xl p-6 reveal reveal-delay-${(index % 3) + 1}`}>
                <p className="text-[var(--fg)] mb-6 italic">&ldquo;{item.quote}&rdquo;</p>
                <div>
                  <div className="font-semibold text-[var(--fg)]">{item.author}</div>
                  <div className="text-sm text-[var(--fg-muted)]">{item.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tryout" className="py-24 relative bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/40 text-sm font-semibold text-[var(--accent)] mb-6 reveal">Free Tryout</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
              Coba <span className="text-[var(--accent)]">TryOut OSN Gratis</span>
            </h2>
            <p className="text-[var(--fg-muted)] text-lg reveal reveal-delay-2">
              Ukur kemampuanmu dulu dengan TryOut nasional. Lihat ranking, dapat analisis hasil, lalu pilih program yang tepat untuk naik level.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { step: 1, title: 'Tryout gratis', desc: 'Ikuti TryOut OSN format resmi. Gratis, tanpa biaya.' },
              { step: 2, title: 'Lihat ranking', desc: 'Cek peringkatmu di leaderboard nasional.' },
              { step: 3, title: 'Analisis hasil', desc: 'Pahami kekuatan & area yang perlu ditingkatkan.' },
              { step: 4, title: 'Offer kelas', desc: 'Dapat rekomendasi program yang sesuai dengan kebutuhanmu.' },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                <div className={`feature-card rounded-2xl p-6 h-full reveal reveal-delay-${(index % 4) + 1}`}>
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white font-display font-bold text-lg flex items-center justify-center mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-[var(--fg-muted)] text-sm">{item.desc}</p>
                </div>
                {item.step < 4 && (
                  <div className="hidden md:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10 text-[var(--border)]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center reveal">
            <a href="#/tryout-info" className="btn-primary px-8 py-4 rounded-full font-semibold inline-block">
              Ikuti TryOut Gratis
            </a>
            <p className="text-[var(--fg-muted)] text-sm mt-3">Lihat jadwal, format soal, dan daftar di halaman TryOut.</p>
          </div>
        </div>
      </section>

      <section id="cta" className="py-20 relative bg-[var(--card)] border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-4 reveal">
            Siap Lolos <span className="text-[var(--accent)]">OSN-K 2026?</span>
          </h2>
          <p className="text-[var(--fg-muted)] text-lg mb-6 reveal">
            Daftar program sekarang dan dapatkan bimbingan dari mentor berpengalaman, tryout nasional, dan dashboard ranking.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-8 reveal">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-sm font-medium text-[var(--fg)]">
              📅 {URGENCY.batch}
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-sm font-medium text-[var(--fg)]">
              👥 Kuota hanya {URGENCY.quotaMax} siswa
            </span>
            {getEarlyBirdDaysLeft() > 0 && (
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/40 text-sm font-semibold text-[var(--accent)]">
                ⏰ Early Bird berakhir dalam {getEarlyBirdDaysLeft()} hari
              </span>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3 reveal">
            <a href={REGISTER_URL} target="_blank" rel="noreferrer" className="btn-primary px-6 py-2.5 rounded-full font-semibold text-sm inline-block">
              Daftar Sekarang
            </a>
            <a href={waUrl(WA_TEMPLATES.tanyaProgram)} target="_blank" rel="noreferrer" className="btn-secondary px-6 py-2.5 rounded-full font-semibold text-sm inline-block border border-[var(--border)] hover:border-[var(--accent)]">
              Tanya Program
            </a>
          </div>
        </div>
      </section>

      <section id="articles" className="hidden py-24 relative bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">Artikel</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
              Artikel & <span className="text-[var(--accent)]">Tips</span> OSN
            </h2>
            <p className="text-[var(--fg-muted)] text-lg reveal reveal-delay-2">
              Baca tips, materi, dan informasi terbaru seputar persiapan OSN Informatika.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article, index) => (
              <article
                key={article.id}
                className={`feature-card rounded-2xl overflow-hidden reveal reveal-delay-${(index % 3) + 1}`}
              >
                <a href={`#/artikel/${article.slug}`} className="block group">
                  <div className="aspect-video bg-[var(--card)] overflow-hidden">
                    <img
                      src={article.image || 'https://placehold.co/600x320/161616/c9fd02?text=Artikel'}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    {article.category && (
                      <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent)] text-white text-xs font-semibold mb-3">
                        {article.category}
                      </span>
                    )}
                    <h3 className="font-display font-semibold text-xl mb-2 group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-[var(--fg-muted)] text-sm line-clamp-2 mb-3">{article.excerpt}</p>
                    <time className="text-xs text-[var(--fg-muted)]" dateTime={article.publishedAt}>
                      {new Date(article.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </time>
                  </div>
                </a>
              </article>
            ))}
          </div>

          {articles.length > 0 && (
            <div className="text-center mt-12 reveal">
              <a href="#articles" className="btn-secondary px-8 py-4 rounded-full font-semibold inline-block">
                Lihat Semua Artikel
              </a>
            </div>
          )}
        </div>
      </section>

      <section id="request" className="py-24 relative bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="feature-card rounded-3xl p-8 lg:p-12 text-center reveal">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6">
              Request Bidang Lainnya
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6">
              Ingin Request <span className="text-[var(--accent)]">Bidang Lainnya?</span>
            </h2>
            <p className="text-[var(--fg-muted)] text-lg max-w-3xl mx-auto mb-8">
              Jika Anda membutuhkan program pelatihan di bidang selain OSN Informatika, tim kami siap menerima masukan dan menyesuaikan kebutuhan belajar Anda.
            </p>
            <a
              href={waUrl(WA_TEMPLATES.requestBidang)}
              target="_blank"
              rel="noreferrer"
              className="btn-primary px-8 py-4 rounded-full font-semibold text-center inline-block"
            >
              Kirim Request
            </a>
          </div>
        </div>
      </section>

      <section id="contact" className="py-24 relative bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">Hubungi Kami</span>
              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
                Siap Memulai <span className="text-[var(--accent)]">Perjalanan?</span>
              </h2>
              <p className="text-[var(--fg-muted)] text-lg mb-8 reveal reveal-delay-2">
                Hubungi kami untuk informasi lebih lanjut tentang program pelatihan, jadwal, dan pendaftaran.
              </p>

              <div className="space-y-6 reveal reveal-delay-3">
                {[
                  ['WhatsApp', '+62 851-2127-7161', waUrl(WA_TEMPLATES.contact)],
                  ['Instagram', '@fansedu.official', 'https://www.instagram.com/fansedu.official'],
                  ['TikTok', '@fansedu.official', 'https://www.tiktok.com/@fansedu.official'],
                  ['YouTube', '@fansedu.official', 'https://www.youtube.com/@fansedu.official'],
                ].map(([title, subtitle, href]) => (
                  <a key={title} href={href} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors group">
                    <div className="w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center">
                      <span className="font-display font-bold text-white">{title[0]}</span>
                    </div>
                    <div>
                      <div className="font-semibold group-hover:text-[var(--accent)] transition-colors">{title}</div>
                      <div className="text-sm text-[var(--fg-muted)]">{subtitle}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="flex items-center reveal">
              <div className="feature-card rounded-3xl p-8 lg:p-12 w-full text-center">
                <div className="w-20 h-20 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    ></path>
                  </svg>
                </div>
                <h3 className="font-display font-bold text-2xl lg:text-3xl mb-4">Mulai Persiapan OSN Sekarang</h3>
                <p className="text-[var(--fg-muted)] mb-8 max-w-md mx-auto">
                  Jangan biarkan kesempatan berlalu. Persiapkan diri Anda dengan program pelatihan terbaik untuk meraih medali di OSN Informatika.
                </p>
                <a href={waUrl(WA_TEMPLATES.contact)} target="_blank" rel="noreferrer" className="btn-primary px-8 py-4 rounded-full font-semibold text-center inline-block">
                  Hubungi Kami Sekarang
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <a href="#hero" className="flex items-center gap-3 mb-4" onClick={(event) => handleAnchorClick(event, '#hero')}>
                <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                  <span className="font-display font-bold text-white text-lg">F</span>
                </div>
                <span className="font-display font-semibold text-xl">Fansedu Informatic Olympiad</span>
              </a>
              <p className="text-[var(--fg-muted)] max-w-sm">
                Platform pelatihan OSN Informatika terpercaya untuk siswa SMA yang ingin meraih prestasi di kompetisi olimpiade.
              </p>
            </div>

            <div>
              <h4 className="font-display font-semibold mb-4">Navigasi</h4>
              <nav className="flex flex-col gap-2">
                <a href="#solusi" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#solusi')}>
                  Tentang Kami
                </a>
                <a href="#masalah" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#masalah')}>
                  Tantangan
                </a>
                <a href="#features" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#features')}>
                  Fitur
                </a>
                <a href="#packages" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#packages')}>
                  Program
                </a>
                <a href="#testimoni" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#testimoni')}>
                  Testimoni
                </a>
                <a href="#tryout" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#tryout')}>
                  TryOut Gratis
                </a>
                <a href="#request" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#request')}>
                  Request Bidang
                </a>
                <a href="#contact" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#contact')}>
                  Kontak
                </a>
              </nav>
            </div>

            <div>
              <h4 className="font-display font-semibold mb-4">Sosial Media</h4>
              <div className="flex flex-col gap-2">
                <a href="https://www.instagram.com/fansedu.official" target="_blank" rel="noreferrer" className="nav-link text-sm">
                  Instagram
                </a>
                <a href="https://www.tiktok.com/@fansedu.official" target="_blank" rel="noreferrer" className="nav-link text-sm">
                  TikTok
                </a>
                <a href="https://www.youtube.com/@fansedu.official" target="_blank" rel="noreferrer" className="nav-link text-sm">
                  YouTube
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[var(--fg-muted)]">2024 Fansedu Informatic Olympiad. All rights reserved.</p>
            <p className="text-sm text-[var(--fg-muted)]">Dibuat dengan dedikasi untuk pendidikan Indonesia.</p>
          </div>
        </div>
      </footer>

      <a href={waUrl(WA_TEMPLATES.float)} target="_blank" rel="noreferrer" className="wa-float" aria-label="Chat via WhatsApp">
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      <div className="sticky-cta-mobile fixed bottom-0 left-0 right-0 z-[900] md:hidden safe-area-pb">
        <a
          href={REGISTER_URL}
          target="_blank"
          rel="noreferrer"
          className="block w-full py-4 px-6 text-center font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
        >
          Daftar Sekarang
        </a>
      </div>
    </div>
  )
}

export default App

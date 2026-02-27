import { useEffect, useState } from 'react'
import './App.css'
import type { Article } from './types/article'

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
  useEffect(() => {
    const api = import.meta.env.VITE_ARTICLES_API_URL as string | undefined
    if (!api) return
    fetch(api)
      .then((r) => r.json())
      .then((data: Article[]) => setArticles(Array.isArray(data) ? data : []))
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
    <div className="wrapper">
      <header className={`navbar fixed top-0 left-0 right-0 z-50 ${navbarSolid ? 'navbar-solid' : ''}`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <a href="#hero" className="flex items-center gap-3" onClick={(event) => handleAnchorClick(event, '#hero')}>
              <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-[var(--bg)] text-lg">F</span>
              </div>
              <span className="font-display font-semibold text-xl hidden sm:block">Fansedu</span>
            </a>

            <div className="hidden md:flex items-center gap-8">
              <nav className="flex items-center gap-8">
                <a href="#tryout" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#tryout')}>
                  TryOut
                </a>
                <a href="#about" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#about')}>
                  Tentang
                </a>
                <a href="#services" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#services')}>
                  Layanan
                </a>
                <a href="#features" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#features')}>
                  Keunggulan
                </a>
                <a href="#request" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#request')}>
                  Request Bidang
                </a>
                <a href="#contact" className="nav-link font-medium" onClick={(event) => handleAnchorClick(event, '#contact')}>
                  Kontak
                </a>
              </nav>
              <a href="https://wa.me/6285121277161" target="_blank" rel="noreferrer" className="btn-primary px-6 py-3 rounded-full font-semibold text-sm inline-block">
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
            <a href="#tryout" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#tryout')}>
              TryOut
            </a>
            <a href="#about" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#about')}>
              Tentang
            </a>
            <a href="#services" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#services')}>
              Layanan
            </a>
            <a href="#features" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#features')}>
              Keunggulan
            </a>
            <a href="#request" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#request')}>
              Request Bidang
            </a>
            <a href="#contact" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#contact')}>
              Kontak
            </a>
          </nav>
          <div className="mt-8">
            <a href="https://wa.me/6285121277161" target="_blank" rel="noreferrer" className="btn-primary px-6 py-4 rounded-full font-semibold text-center block">
              Hubungi Kami
            </a>
          </div>
        </div>
      </div>

      {/* Try Out Info Banner - Free TryOut Nasional OSN Informatika 2026 */}
      <section id="tryout" className="relative bg-[var(--card)] border-b border-[var(--border)] pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--card)] border border-[var(--border)] p-6 md:p-8">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent)] text-[var(--bg)] text-xs font-semibold uppercase tracking-wide mb-3">
                Gratis
              </span>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[var(--fg)] mb-1">
                Free TryOut Nasional — OSN Informatika 2026
              </h2>
              <p className="text-[var(--fg-muted)] text-sm sm:text-base">
                Mulai <strong className="text-[var(--fg)]">Kamis, 5 Maret 2026 pukul 13.00 WIB</strong>. Batas pendaftaran <strong className="text-[var(--fg)]">Rabu, 4 Maret 2026 pukul 23.59 WIB</strong>. Link dan akses TryOut akan dikirim sekitar 1 jam sebelum pelaksanaan ke email peserta.
              </p>
              <a href="#/tryout-info" className="inline-block mt-3 text-sm text-[var(--accent)] hover:underline">
                Info lengkap: detail soal, penilaian, leaderboard & penggunaan AI →
              </a>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <a
                href="https://forms.gle/y9RMAYeS6bxJ6axH6"
                target="_blank"
                rel="noreferrer noopener"
                className="btn-primary px-6 py-4 rounded-full font-semibold text-center whitespace-nowrap"
              >
                Daftar TryOut
              </a>
              <a href="#/tryout-info" className="btn-secondary px-6 py-4 rounded-full font-semibold text-center whitespace-nowrap">
                Detail TryOut
              </a>
              <a href="#/leaderboard" className="btn-secondary px-6 py-4 rounded-full font-semibold text-center whitespace-nowrap">
                Leaderboard
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="hero" className="relative min-h-screen flex items-center grid-bg overflow-hidden">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="reveal">
                <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6">
                  Pelatihan OSN Informatika Terpercaya
                </span>
              </div>

              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6 reveal reveal-delay-1">
                Raih Medali di <span className="text-[var(--accent)]">OSN Informatika</span> Bersama Kami
              </h1>

              <p className="text-lg text-[var(--fg-muted)] mb-8 max-w-xl reveal reveal-delay-2">
                Program pelatihan intensif dengan metode pembelajaran terstruktur, tryout berkala, dan pembahasan mendalam untuk memaksimalkan potensi siswa dalam kompetisi olimpiade informatika.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12 reveal reveal-delay-3">
                <a href="https://wa.me/6285121277161" target="_blank" rel="noreferrer" className="btn-primary px-8 py-4 rounded-full font-semibold text-center">
                  Daftar Sekarang
                </a>
                <a href="#about" className="btn-secondary px-8 py-4 rounded-full font-semibold text-center" onClick={(event) => handleAnchorClick(event, '#about')}>
                  Pelajari Lebih Lanjut
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
                        <svg className="w-6 h-6 text-[var(--bg)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <section id="about" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal">
                <div className="feature-card rounded-3xl p-8 lg:p-12 h-full flex flex-col items-center justify-center text-center">
                  <img src="/fansedu.png" alt="Fansedu logo" className="w-40 sm:w-48 rounded-2xl mb-6" />
                  <h2 className="font-display font-bold text-2xl lg:text-3xl">About Fansedu</h2>
                </div>
            </div>

            <div>
              <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">
                Tentang Kami
              </span>

              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
                Membangun Generasi <span className="text-[var(--accent)]">Kompetitif</span>
              </h2>

              <p className="text-[var(--fg-muted)] text-lg mb-6 reveal reveal-delay-2">
                Fansedu Informatic Olympiad hadir sebagai solusi bagi siswa SMA dan guru pembimbing OSN yang ingin mempersiapkan diri menghadapi Olimpiade Sains Nasional bidang Informatika dengan lebih terstruktur dan efektif.
              </p>

              <p className="text-[var(--fg-muted)] mb-8 reveal reveal-delay-3">
                Fansedu baru berdiri pada 2026, dengan tim pengajar yang telah berpengalaman membimbing OSN sejak 2014 melalui pembelajaran online interaktif, pelatihan offline, tryout berkala, dan arsip pembahasan yang lengkap.
              </p>

              <div className="grid grid-cols-2 gap-6 reveal reveal-delay-4">
                {['Online Learning', 'Free TryOut', 'Record Pembahasan', 'Record Pelatihan'].map((item) => (
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
        </div>
      </section>

      <section id="services" className="py-24 relative bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">Layanan Kami</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
              Program Pelatihan <span className="text-[var(--accent)]">Komprehensif</span>
            </h2>
            <p className="text-[var(--fg-muted)] text-lg reveal reveal-delay-2">
              Dirancang khusus untuk mempersiapkan siswa menghadapi OSN Informatika dengan materi terstruktur dan pendampingan intensif.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              ['Pelatihan Online', 'Sesi pembelajaran interaktif via platform online dengan jadwal fleksibel yang dapat diakses dari mana saja.'],
              ['TryOut Berkala', 'Simulasi ujian dengan format dan tingkat kesulitan mendekati OSN sebenarnya untuk mengukur kemampuan.'],
              ['Video Pembahasan', 'Akses ke arsip video pembahasan soal-soal OSN tahun sebelumnya dengan penjelasan mendalam.'],
              ['Materi Terstruktur', 'Kurikulum pembelajaran yang disusun secara sistematis dari dasar hingga tingkat lanjut.'],
              ['Komunitas Aktif', 'Bergabung dengan komunitas siswa dan mentor untuk diskusi dan sharing pengetahuan.'],
              ['Konsultasi Mentor', 'Sesi konsultasi langsung dengan mentor berpengalaman untuk bimbingan personal.'],
            ].map(([title, desc], index) => (
              <div key={title} className={`feature-card service-card rounded-2xl p-8 reveal reveal-delay-${(index % 4) + 1}`}>
                <div className="feature-icon w-14 h-14 rounded-2xl bg-[var(--accent)] flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-[var(--bg)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    ></path>
                  </svg>
                </div>
                <h3 className="font-display font-semibold text-xl mb-3">{title}</h3>
                <p className="text-[var(--fg-muted)]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">Keunggulan</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
              Mengapa Memilih <span className="text-[var(--accent)]">Fansedu?</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {[
              ['Pembelajaran Efektif', 'Metode pembelajaran yang teruji dengan hasil nyata dalam peningkatan kemampuan siswa.'],
              ['Akses 24/7', 'Fleksibilitas penuh untuk mengakses materi kapan saja sesuai jadwal siswa.'],
              ['Garansi Kualitas', 'Kurikulum disusun oleh praktisi dan alumni OSN berpengalaman.'],
              ['Mentor Berpengalaman', 'Tim pengajar terdiri dari medalis dan pelatih OSN berpengalaman.'],
              ['Arsip Lengkap', 'Akses ke semua rekaman pelatihan dan pembahasan tanpa batas waktu.'],
              ['Harga Terjangkau', 'Investasi pendidikan dengan nilai terbaik untuk hasil maksimal.'],
            ].map(([title, desc], index) => (
              <div key={title} className={`feature-card rounded-2xl p-6 flex gap-5 reveal reveal-delay-${(index % 4) + 1}`}>
                <div className="feature-icon w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[var(--bg)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent)] text-[var(--bg)] text-xs font-semibold mb-3">
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
              href="https://wa.me/6285121277161?text=Halo%20Fansedu%2C%20saya%20ingin%20request%20program%20bidang%20lainnya."
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
                  ['WhatsApp', '+62 851-2127-7161', 'https://wa.me/6285121277161'],
                  ['Instagram', '@fansedu.official', 'https://www.instagram.com/fansedu.official'],
                  ['TikTok', '@fansedu.official', 'https://www.tiktok.com/@fansedu.official'],
                  ['YouTube', '@fansedu.official', 'https://www.youtube.com/@fansedu.official'],
                ].map(([title, subtitle, href]) => (
                  <a key={title} href={href} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors group">
                    <div className="w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center">
                      <span className="font-display font-bold text-[var(--bg)]">{title[0]}</span>
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
                  <svg className="w-10 h-10 text-[var(--bg)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <a href="https://wa.me/6285121277161" target="_blank" rel="noreferrer" className="btn-primary px-8 py-4 rounded-full font-semibold text-center inline-block">
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
                  <span className="font-display font-bold text-[var(--bg)] text-lg">F</span>
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
                <a href="#about" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#about')}>
                  Tentang
                </a>
                <a href="#services" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#services')}>
                  Layanan
                </a>
                <a href="#features" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#features')}>
                  Keunggulan
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

      <a href="https://wa.me/6285121277161" target="_blank" rel="noreferrer" className="wa-float" aria-label="Chat via WhatsApp">
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  )
}

export default App

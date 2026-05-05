import { useEffect, useRef, useState } from 'react'
import './App.css'
import type { Article } from './types/article'
import { getPackages, trackAnalyticsEvent, trackPageview } from './lib/api'
import { normalizeAuthFields } from './types/auth'
import { formatRupiah } from './lib/currency'

/** Paket / program yang sedang dibuka — dari GET /api/v1/packages atau mock */
export interface LandingPackage {
  id: string
  name: string
  slug: string
  shortDescription: string | null
  price: number
  priceEarlyBird?: number | null
  priceNormal?: number | null
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

const WA_NUMBER = '6285121277161'

/** Build link WhatsApp dengan template pesan terisi */
function waUrl(message: string): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`
}

/** Template pesan WA per section (bisa dipindah ke backend/site_settings nanti) */
const WA_TEMPLATES = {
  navbar: 'Halo Fansedu, saya ingin bertanya tentang program pelatihan OSN.',
  hero: 'Halo Fansedu, saya tertarik mendaftar program pelatihan OSN (Informatika / Matematika SMP / Matematika SD). Boleh info lebih lanjut?',
  heroSlot: 'Halo Fansedu, saya ingin amankan slot program OSN Batch Mei 2026. Boleh info program dan harganya?',
  /** Setelah promo resmi berakhir — tanya penawaran yang masih berlaku */
  promoBaru: 'Halo Fansedu, saya ingin menanyakan promo atau penawaran terbaru untuk program pelatihan OSN.',
  tanyaProgram: 'Halo Fansedu, saya ingin bertanya tentang program dan pendaftaran.',
  requestBidang: 'Halo Fansedu, saya ingin request program bidang OSN lainnya.',
  contact: 'Halo Fansedu, saya ingin bertanya lebih lanjut tentang program pelatihan OSN dan pendaftaran.',
  float: 'Halo Fansedu, saya ada pertanyaan tentang program OSN.',
} as const

/** Base path LMS: gunakan hash routing dalam project yang sama (#/auth, #/student, #/guru) */
const LMS_BASE = '#'

/** Link daftar akun di platform (LMS) — tetap di URL yang sama (hash routing) */
const REGISTER_URL = `${LMS_BASE}/auth?tab=register`

/** Key sessionStorage auth dari LMS (Zustand persist 'fansedu-auth') */
const AUTH_STORAGE_KEY = 'fansedu-auth'

function getStoredAuthUser(): { name: string; role: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      state?: {
        user?: { name?: string; role?: string; roleCode?: string }
        token?: string | null
      }
    }
    const token = parsed?.state?.token
    if (typeof token !== 'string' || !token.trim()) return null
    const user = parsed?.state?.user
    if (!user || (!user.name && !user.role)) return null
    return { name: user.name ?? '', role: normalizeAuthFields(user.role, user.roleCode, null) }
  } catch {
    return null
  }
}

/** Urgency: batch, kuota, deadline — ubah sesuai jadwal nyata */
const URGENCY = {
  batch: 'Batch 1 & Batch 2 Mei 2026',
  quotaMax: 30,
  /** Slot tersisa (display marketing; sesuaikan dengan data real). */
  slotsRemaining: 12,
  /**
   * Pendaftaran Batch 1 ditutup 3 Mei 2026.
   * Countdown akan menghitung ke sini terlebih dahulu.
   */
  earlyBirdEnd: new Date('2026-05-03T23:59:59+07:00'),
  batch1EndsAt: new Date('2026-05-03T23:59:59+07:00'),
  /**
   * Pendaftaran Batch 2 ditutup 17 Mei 2026.
   * Countdown beralih ke sini setelah Batch 1 tutup.
   */
  promoEndsAt: new Date('2026-05-17T23:59:59+07:00'),
  promoLabel: 'Early Bird Batch 1',
  /** Tanggal teks akhir promo (selaras dengan promoEndsAt). */
  promoEndDisplay: '17 Mei 2026',
} as const

/** Info kedua batch untuk ditampilkan di hero & pricing */
const BATCH_DATES = {
  batch1: { label: 'Batch 1', period: '1 Mei – 3 Mei 2026', closeDisplay: '3 Mei 2026' },
  batch2: { label: 'Batch 2', period: '4 Mei – 17 Mei 2026', closeDisplay: '17 Mei 2026' },
} as const

function getEarlyBirdDaysLeft(): number {
  const now = new Date()
  const end = URGENCY.earlyBirdEnd
  if (now >= end) return 0
  const diff = end.getTime() - now.getTime()
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)))
}

function formatUrgencyDate(date: Date): string {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Countdown ke deadline terdekat: Batch 1 (3 Mei) → lalu Batch 2 (17 Mei). */
function getPromoCountdownLabel(): {
  headline: string
  timer: string
  ended: boolean
  urgent24h: boolean
  activeBatch: 1 | 2 | null
  /** Teks penjelas jika promo sudah lewat; null jika masih berjalan */
  endedBody: string | null
} {
  const now = Date.now()
  // Pilih target deadline terdekat yang belum lewat
  const batch1Ms = URGENCY.batch1EndsAt.getTime() - now
  const batch2Ms = URGENCY.promoEndsAt.getTime() - now

  if (batch1Ms > 0) {
    // Batch 1 masih buka — hitung mundur ke penutupan Batch 1
    const totalSec = Math.floor(batch1Ms / 1000)
    const days = Math.floor(totalSec / 86400)
    const h = Math.floor((totalSec % 86400) / 3600)
    const urgent24h = days < 1
    return {
      headline: urgent24h ? 'Kurang dari 24 jam! Batch 1 ditutup segera' : 'Pendaftaran Batch 1 ditutup dalam',
      timer: urgent24h ? `${h} jam tersisa` : `${days} hari ${h} jam`,
      ended: false,
      urgent24h,
      activeBatch: 1,
      endedBody: null,
    }
  }

  if (batch2Ms > 0) {
    // Batch 1 sudah tutup, hitung mundur ke penutupan Batch 2
    const totalSec = Math.floor(batch2Ms / 1000)
    const days = Math.floor(totalSec / 86400)
    const h = Math.floor((totalSec % 86400) / 3600)
    const urgent24h = days < 1
    return {
      headline: urgent24h ? 'Kurang dari 24 jam! Batch 2 ditutup segera' : 'Pendaftaran Batch 2 ditutup dalam',
      timer: urgent24h ? `${h} jam tersisa` : `${days} hari ${h} jam`,
      ended: false,
      urgent24h,
      activeBatch: 2,
      endedBody: null,
    }
  }

  // Semua batch sudah tutup
  return {
    headline: 'Pendaftaran periode ini sudah ditutup',
    timer: '',
    ended: true,
    urgent24h: false,
    activeBatch: null,
    endedBody: `Batch 1 (${BATCH_DATES.batch1.period}) dan Batch 2 (${BATCH_DATES.batch2.period}) sudah ditutup. Untuk info batch berikutnya atau promo terbaru, hubungi tim Fansedu.`,
  }
}

const POPULAR_PROGRAM_SLUG = 'pelatihan-intensif-osn-k-2026'

const MOCK_PACKAGES: LandingPackage[] = [
  {
    id: '1',
    name: 'Algorithm & Programming Foundation',
    slug: 'algorithm-programming-foundation',
    shortDescription: 'Kelas dasar untuk membangun fondasi berpikir algoritmik dan pemrograman yang dibutuhkan dalam kompetisi informatika.',
    price: 249000,
    priceEarlyBird: 249000,
    priceNormal: 399000,
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
    price: 349000,
    priceEarlyBird: 349000,
    priceNormal: 500000,
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
    price: 549000,
    priceEarlyBird: 549000,
    priceNormal: 899000,
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
  {
    id: '4',
    name: 'OSN Matematika SMP 2026',
    slug: 'osn-matematika-smp-2026',
    shortDescription: 'Program pelatihan intensif OSN Matematika khusus jenjang SMP. Dari aljabar dan geometri dasar hingga strategi kompetisi tingkat kabupaten.',
    price: 299000,
    priceEarlyBird: 299000,
    priceNormal: 450000,
    ctaUrl: waUrl('Saya ingin bertanya detail terkait program OSN Matematika SMP 2026.'),
    ctaLabel: 'Daftar / Tanya',
    isOpen: true,
    durasi: '4 Minggu',
    materi: [
      'Aljabar, geometri, dan kombinatorika level OSN SMP',
      'Pola soal yang sering keluar di seleksi kabupaten & provinsi',
      'Teknik penyelesaian soal olimpiade non-kalkulator',
      'Strategi manajemen waktu saat kompetisi',
    ],
    fasilitas: [
      '2x Live Class per minggu',
      '2x Tryout Nasional format OSN SMP',
      'Rekaman kelas & video pembahasan soal',
      'Dashboard ranking nasional peserta',
    ],
  },
  {
    id: '5',
    name: 'OSN Matematika SD 2026',
    slug: 'osn-matematika-sd-2026',
    shortDescription: 'Program pelatihan OSN Matematika jenjang SD. Membangun fondasi berpikir logis dan terbiasa dengan soal olimpiade sejak dini.',
    price: 249000,
    priceEarlyBird: 249000,
    priceNormal: 399000,
    ctaUrl: waUrl('Saya ingin bertanya detail terkait program OSN Matematika SD 2026.'),
    ctaLabel: 'Daftar / Tanya',
    isOpen: true,
    durasi: '4 Minggu',
    materi: [
      'Aritmetika, pola bilangan, dan geometri dasar olimpiade SD',
      'Soal tipe KSN/OSN SD dengan pembahasan step-by-step',
      'Berpikir logis dan sistematis sejak dini',
      'Strategi menghadapi soal cerita olimpiade',
    ],
    fasilitas: [
      '2x Live Class per minggu',
      'Latihan soal terstruktur & tryout simulasi',
      'Rekaman kelas yang bisa diulang kapan saja',
      'Forum diskusi orang tua & peserta',
    ],
  },
]

const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@fansedu.official'
/** Set di .env: `VITE_HERO_YOUTUBE_VIDEO_ID=xxxxx` (11 karakter dari URL watch) — paling andal di production. */
const YOUTUBE_VIDEO_ID_PLACEHOLDER = (import.meta.env.VITE_HERO_YOUTUBE_VIDEO_ID as string) || ''

// Placeholder artikel; nanti diganti dengan fetch dari backend (mis. GET /api/articles)
const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Tips Persiapan OSN Informatika 2026',
    excerpt: 'Langkah-langkah praktis mempersiapkan diri menghadapi OSN Informatika dari persiapan materi hingga manajemen waktu.',
    image: 'https://placehold.co/600x320/161616/c9fd02?text=Tips+OSN+Informatika',
    slug: 'tips-persiapan-osn-informatika-2026',
    publishedAt: '2026-02-20',
    category: 'Informatika',
  },
  {
    id: '2',
    title: 'Strategi Lolos OSN Matematika SMP 2026',
    excerpt: 'Materi prioritas dan strategi pengerjaan soal olimpiade Matematika SMP yang sering ditanyakan di seleksi tingkat kabupaten dan provinsi.',
    image: 'https://placehold.co/600x320/161616/c9fd02?text=OSN+Mat+SMP',
    slug: 'strategi-lolos-osn-matematika-smp-2026',
    publishedAt: '2026-02-15',
    category: 'Matematika SMP',
  },
  {
    id: '3',
    title: 'Persiapan OSN Matematika SD: Mulai dari Mana?',
    excerpt: 'Panduan untuk orang tua dan siswa SD yang ingin memulai persiapan olimpiade matematika sejak dini — fondasi, latihan, dan tryout.',
    image: 'https://placehold.co/600x320/161616/c9fd02?text=OSN+Mat+SD',
    slug: 'persiapan-osn-matematika-sd-mulai-dari-mana',
    publishedAt: '2026-02-10',
    category: 'Matematika SD',
  },
]

const FAQ_ITEMS = [
  {
    q: 'Bidang OSN apa saja yang tersedia di Fansedu?',
    a: 'Saat ini tersedia tiga program: OSN Informatika (SMA), OSN Matematika SMP, dan OSN Matematika SD. Masing-masing memiliki kurikulum, mentor, dan tryout tersendiri sesuai jenjang.',
  },
  {
    q: 'Apakah program Informatika cocok untuk pemula yang belum kenal C++ sama sekali?',
    a: 'Ya, program Foundation Informatika dirancang khusus untuk pemula. Kami mulai dari dasar: logika berpikir, sintaks C++, hingga struktur data dasar. Tidak perlu pengalaman coding sebelumnya.',
  },
  {
    q: 'Program Matematika SD apakah perlu bimbingan orang tua?',
    a: 'Live class bisa diikuti mandiri oleh siswa SD, tapi kami juga menyediakan grup diskusi orang tua agar bisa membantu latihan di rumah. Rekaman kelas bisa ditonton ulang bersama.',
  },
  {
    q: 'Bagaimana jika tidak bisa hadir di live class?',
    a: 'Tidak masalah. Semua sesi live class direkam dan bisa kamu akses kapan saja di platform. Tidak ada batas waktu akses rekaman selama program berjalan.',
  },
  {
    q: 'Berapa lama durasi setiap program?',
    a: 'Semua program berdurasi 4 minggu dengan 2x live class per minggu, kecuali Kelas Gabungan Informatika (Foundation + OSN-K) yang berdurasi 6 minggu.',
  },
  {
    q: 'Apakah ada sertifikat setelah selesai program?',
    a: 'Tidak. Peserta yang menyelesaikan program tidak mendapatkan sertifikat digital kelulusan dari Fansedu. Karena ini hanya untuk persiapan lomba dan tidak menjamin kelulusan OSN, kami fokus pada kualitas materi dan pembelajaran daripada sertifikat.',
  },
  {
    q: 'Bagaimana cara pembayaran dan konfirmasi pendaftaran?',
    a: 'Pembayaran bisa dilakukan via transfer bank atau melalui platform Fansedu. Setelah pembayaran, konfirmasi ke tim kami via WhatsApp dan akses program langsung aktif di dashboard siswa.',
  },
  {
    q: 'Apakah program online atau offline?',
    a: 'Sepenuhnya online. Live class via platform video conference, materi dan latihan soal ada di dashboard platform — bisa diikuti dari mana saja di seluruh Indonesia.',
  },
  {
    q: `Kapan ${URGENCY.batch} mulai dan berapa kuotanya?`,
    a: `Ada dua gelombang: ${BATCH_DATES.batch1.label} berlangsung ${BATCH_DATES.batch1.period}, dan ${BATCH_DATES.batch2.label} berlangsung ${BATCH_DATES.batch2.period}. Kuota per kelas hanya ${URGENCY.quotaMax} siswa untuk menjaga kualitas interaksi dengan mentor. Daftar sebelum penuh.`,
  },
  {
    q: 'Apakah ada garansi lolos OSN?',
    a: 'Kami tidak menjanjikan kelulusan karena banyak faktor yang mempengaruhi. Yang kami pastikan adalah kurikulum berkualitas, mentor berpengalaman (alumni & pelatih OSN per bidang), dan tryout nasional yang mempersiapkan kamu seoptimal mungkin.',
  },
]

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [navbarSolid, setNavbarSolid] = useState(false)
  const [authUser, setAuthUser] = useState<{ name: string; role: string } | null>(() => getStoredAuthUser())
  const [heroVideoId, setHeroVideoId] = useState<string>(YOUTUBE_VIDEO_ID_PLACEHOLDER)
  // Artikel: diisi dari backend bila VITE_ARTICLES_API_URL diset
  const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES)
  // Paket / program: diisi dari backend GET /api/v1/packages (hanya is_open = true)
  const [packages, setPackages] = useState<LandingPackage[]>(MOCK_PACKAGES)
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null)
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const urgencyDateLabel = formatUrgencyDate(URGENCY.earlyBirdEnd)
  const [, setCountdownTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setCountdownTick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])
  const promoCountdown = getPromoCountdownLabel()
  useEffect(() => {
    const onFocus = () => setAuthUser(getStoredAuthUser())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  useEffect(() => {
    if (!isMenuOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isMenuOpen])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onWide = () => {
      if (mq.matches) setIsMenuOpen(false)
    }
    mq.addEventListener('change', onWide)
    return () => mq.removeEventListener('change', onWide)
  }, [])
  useEffect(() => {
    const api = import.meta.env.VITE_ARTICLES_API_URL as string | undefined
    if (!api) return
    fetch(api)
      .then((r) => r.json())
      .then((data: Article[]) => setArticles(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])
  // Track pageview saat landing page dimuat (fire-and-forget)
  const pageviewTrackedRef = useRef(false)
  useEffect(() => {
    if (pageviewTrackedRef.current) return
    pageviewTrackedRef.current = true
    trackPageview({ page: '/' })
  }, [])

  // Fetch packages dari api/v1/packages sekali saja (sumber: landing, katalog, detail)
  const packagesFetchedRef = useRef(false)
  useEffect(() => {
    if (packagesFetchedRef.current) return
    packagesFetchedRef.current = true
    getPackages()
      .then((list) => { if (list.length > 0) setPackages(list as LandingPackage[]) })
      .catch(() => { packagesFetchedRef.current = false })
  }, [])

  // Re-run observer ketika daftar paket berubah (setelah API load), agar card baru ikut di-observe dan dapat .active
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
  }, [packages])

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

  // Dev: ambil videoId pertama lewat proxy Vite same-origin (lihat vite.config `/__youtube_channel`).
  // Production: jangan fetch ke proxy pihak ketiga (CORS/522); pakai VITE_HERO_YOUTUBE_VIDEO_ID atau placeholder.
  useEffect(() => {
    if (YOUTUBE_VIDEO_ID_PLACEHOLDER) return
    if (!import.meta.env.DEV) return

    const controller = new AbortController()
    fetch('/__youtube_channel', { signal: controller.signal })
      .then((res) => (res.ok ? res.text() : ''))
      .then((html) => {
        if (!html) return
        const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
        if (videoIdMatch?.[1]) {
          setHeroVideoId(videoIdMatch[1])
          return
        }
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

  const trackConversionEvent = (event: string, payload?: Record<string, unknown>) => {
    trackAnalyticsEvent({
      event,
      page: '/',
      metadata: payload,
    })
  }

  return (
    <div className="wrapper pb-20 md:pb-0">
      <header className={`navbar fixed top-0 left-0 right-0 z-50 ${navbarSolid ? 'navbar-solid' : ''}`}>
        <nav className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10" aria-label="Navigasi utama">
          <div className="flex items-center justify-between gap-3 min-h-[5rem]">
            <a
              href="#hero"
              className="flex shrink-0 items-center gap-2 sm:gap-3 min-w-0"
              onClick={(event) => handleAnchorClick(event, '#hero')}
            >
              <div className="w-10 h-10 shrink-0 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-white text-lg">F</span>
              </div>
              <span className="font-display font-semibold text-lg sm:text-xl hidden sm:block truncate">Fansedu</span>
            </a>

            <div className="hidden lg:flex flex-1 min-w-0 items-center justify-end gap-3 xl:gap-5">
              <nav
                className="flex min-w-0 max-w-full items-center justify-end gap-x-2 gap-y-1 xl:gap-x-4 2xl:gap-x-6 overflow-x-auto overscroll-x-contain py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label="Tautan halaman"
              >
                <a
                  href="#tryout"
                  className="nav-link shrink-0 whitespace-nowrap font-medium text-sm xl:text-base text-[var(--accent)]"
                  onClick={(event) => handleAnchorClick(event, '#tryout')}
                >
                  Tryout Gratis
                </a>
                <a
                  href="#packages"
                  className="nav-link shrink-0 whitespace-nowrap font-medium text-sm xl:text-base"
                  onClick={(event) => handleAnchorClick(event, '#packages')}
                >
                  Program &amp; Harga
                </a>
                <a
                  href="#solusi"
                  className="nav-link shrink-0 whitespace-nowrap font-medium text-sm xl:text-base"
                  onClick={(event) => handleAnchorClick(event, '#solusi')}
                >
                  Hasil
                </a>
                <a
                  href="#features"
                  className="nav-link shrink-0 whitespace-nowrap font-medium text-sm xl:text-base"
                  onClick={(event) => handleAnchorClick(event, '#features')}
                >
                  Fitur
                </a>
                <a
                  href="#testimoni"
                  className="nav-link shrink-0 whitespace-nowrap font-medium text-sm xl:text-base"
                  onClick={(event) => handleAnchorClick(event, '#testimoni')}
                >
                  Testimoni
                </a>
                <a
                  href="#request"
                  className="nav-link shrink-0 whitespace-nowrap font-medium text-sm xl:text-base"
                  onClick={(event) => handleAnchorClick(event, '#request')}
                >
                  Request Bidang
                </a>
                <a
                  href="#faq"
                  className="nav-link shrink-0 whitespace-nowrap font-medium text-sm xl:text-base"
                  onClick={(event) => handleAnchorClick(event, '#faq')}
                >
                  FAQ
                </a>
                <a
                  href="#contact"
                  className="nav-link shrink-0 whitespace-nowrap font-medium text-sm xl:text-base"
                  onClick={(event) => handleAnchorClick(event, '#contact')}
                >
                  Kontak
                </a>
              </nav>
              <div className="flex shrink-0 items-center gap-2 pl-1 xl:border-l xl:border-[var(--border)] xl:pl-5">
                <a
                  href="#packages"
                  className="btn-secondary px-4 py-2 xl:px-5 xl:py-2.5 rounded-full font-semibold text-xs xl:text-sm inline-block border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                  onClick={(event) => handleAnchorClick(event, '#packages')}
                >
                  Daftar Program
                </a>
                {authUser ? (
                  <a
                    href={authUser.role === 'guru' ? `${LMS_BASE}/guru` : `${LMS_BASE}/student`}
                    className="btn-primary px-4 py-2.5 xl:px-6 xl:py-3 rounded-full font-semibold text-xs xl:text-sm inline-block"
                  >
                    Dashboard
                  </a>
                ) : (
                  <a href={`${LMS_BASE}/auth`} className="btn-primary px-4 py-2.5 xl:px-6 xl:py-3 rounded-full font-semibold text-xs xl:text-sm inline-block">
                    Masuk
                  </a>
                )}
              </div>
            </div>

            <button
              type="button"
              className="lg:hidden shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Tutup menu' : 'Buka menu'}
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              {isMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </nav>
      </header>

      {isMenuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[1px] lg:hidden"
          aria-label="Tutup menu"
          onClick={() => setIsMenuOpen(false)}
        />
      ) : null}

      <div
        className={`mobile-menu fixed top-0 right-0 z-[45] h-full w-full max-w-sm bg-[var(--bg)] shadow-2xl border-l border-[var(--border)] lg:hidden ${isMenuOpen ? 'active' : ''}`}
      >
        <div className="pt-[5.5rem] px-6 pb-8 overflow-y-auto max-h-screen">
          <nav className="flex flex-col gap-4">
            <a href="#tryout" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)] text-[var(--accent)]" onClick={(event) => handleAnchorClick(event, '#tryout')}>
              Tryout Gratis
            </a>
            <a href="#packages" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#packages')}>
              Program &amp; Harga
            </a>
            <a href="#solusi" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#solusi')}>
              Hasil
            </a>
            <a href="#features" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#features')}>
              Fitur
            </a>
            <a href="#testimoni" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#testimoni')}>
              Testimoni
            </a>
            <a href="#request" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#request')}>
              Request Bidang
            </a>
            <a href="#faq" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => { handleAnchorClick(event, '#faq') }}>
              FAQ
            </a>
            <a href="#contact" className="nav-link font-medium text-lg py-3 border-b border-[var(--border)]" onClick={(event) => handleAnchorClick(event, '#contact')}>
              Kontak
            </a>
          </nav>
          <div className="mt-8 flex flex-col gap-3">
            <a
              href="#packages"
              className="btn-secondary px-6 py-4 rounded-full font-semibold text-center block border-2 border-[var(--accent)] text-[var(--accent)]"
              onClick={(event) => { handleAnchorClick(event, '#packages') }}
            >
              Daftar Program
            </a>
            {authUser ? (
              <a
                href={authUser.role === 'guru' ? `${LMS_BASE}/guru` : `${LMS_BASE}/student`}
                className="btn-primary px-6 py-4 rounded-full font-semibold text-center block"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </a>
            ) : (
              <a
                href={`${LMS_BASE}/auth`}
                className="btn-primary px-6 py-4 rounded-full font-semibold text-center block"
                onClick={() => setIsMenuOpen(false)}
              >
                Masuk
              </a>
            )}
          </div>
        </div>
      </div>

      <section id="hero" className="relative min-h-screen flex items-center grid-bg overflow-hidden">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-24 pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-1">
              <div className="reveal flex flex-wrap items-center gap-2 mb-4">
                {promoCountdown.activeBatch === 1 ? (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 shadow-md ring-1 ring-black/15 dark:ring-white/25">
                    <span aria-hidden={true}>⚠️</span>
                    Slot {BATCH_DATES.batch1.label} hampir penuh
                  </span>
                ) : !promoCountdown.ended ? (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md ring-1 ring-black/15 dark:ring-white/25">
                    <span aria-hidden={true}>⚠️</span>
                    Slot {BATCH_DATES.batch2.label} hampir penuh
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold bg-[var(--card)] text-[var(--fg)] border-2 border-[var(--fg)]/15 shadow-sm">
                  ~{URGENCY.slotsRemaining} slot tersisa
                </span>
                {promoCountdown.activeBatch === 1 && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold bg-[var(--card)] text-[var(--fg)] border border-[var(--border)] shadow-sm">
                    {BATCH_DATES.batch2.label} buka 4 Mei 2026
                  </span>
                )}
              </div>

              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight mb-4 reveal reveal-delay-1">
                Siap Lolos OSN 2026?<br />
                <span className="text-[var(--accent)]">Informatika · Mat SMP · Mat SD</span>
              </h1>
              <p className="text-xl sm:text-2xl text-[var(--fg-muted)] font-medium mb-6 max-w-xl reveal reveal-delay-1">
                Dari tidak tahu apa-apa → kuasai materi → siap lolos seleksi
              </p>

              <ul className="space-y-2 mb-6 reveal reveal-delay-2">
                <li className="flex items-center gap-2 text-[var(--fg)]">
                  <span className="text-[var(--accent)] font-bold">✔</span> 3 bidang: Informatika, Mat SMP, Mat SD
                </li>
                <li className="flex items-center gap-2 text-[var(--fg)]">
                  <span className="text-[var(--accent)] font-bold">✔</span> Latihan soal &amp; tryout nasional format OSN
                </li>
                <li className="flex items-center gap-2 text-[var(--fg)]">
                  <span className="text-[var(--accent)] font-bold">✔</span> Ranking &amp; evaluasi kemampuan real-time
                </li>
              </ul>

              <div
                className={`mb-8 p-4 rounded-2xl border reveal reveal-delay-2 ${
                  promoCountdown.ended
                    ? 'border-[var(--border)] bg-[var(--card)]'
                    : promoCountdown.urgent24h
                      ? 'border-red-400/50 bg-red-500/10'
                      : 'border-[var(--accent)]/30 bg-[var(--accent-light)] dark:bg-[var(--accent)]/10'
                }`}
              >
                <p className="text-sm font-semibold text-[var(--fg)] mb-1">
                  {promoCountdown.ended ? '📌' : '⏳'} {promoCountdown.headline}
                </p>
                {!promoCountdown.ended ? (
                  <>
                    <p className="font-display font-bold text-3xl sm:text-4xl text-[var(--accent)] tabular-nums tracking-tight">
                      {promoCountdown.timer}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <p className="text-xs text-[var(--fg-muted)]">
                        <span className="font-semibold text-[var(--fg)]">{BATCH_DATES.batch1.label}:</span> {BATCH_DATES.batch1.period}
                      </p>
                      <p className="text-xs text-[var(--fg-muted)]">
                        <span className="font-semibold text-[var(--fg)]">{BATCH_DATES.batch2.label}:</span> {BATCH_DATES.batch2.period}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--fg-muted)] mt-1">
                      {promoCountdown.activeBatch === 1
                        ? `${URGENCY.promoLabel} · pendaftaran Batch 1 tutup ${BATCH_DATES.batch1.closeDisplay}`
                        : `Batch 1 sudah tutup · pendaftaran Batch 2 tutup ${BATCH_DATES.batch2.closeDisplay}`
                      }
                    </p>
                  </>
                ) : (
                  <>
                    {promoCountdown.endedBody && (
                      <p className="text-sm text-[var(--fg-muted)] leading-relaxed mt-2">{promoCountdown.endedBody}</p>
                    )}
                    <a
                      href={waUrl(WA_TEMPLATES.promoBaru)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex mt-4 text-sm font-semibold text-[var(--accent)] hover:underline"
                      onClick={() => trackConversionEvent('cta_whatsapp_click', { placement: 'hero_promo_ended' })}
                    >
                      Tanya promo atau penawaran terbaru di WhatsApp →
                    </a>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mb-10 reveal reveal-delay-3">
                <a
                  href={waUrl(WA_TEMPLATES.heroSlot)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary px-6 py-3 rounded-full font-semibold text-sm text-center shadow-lg shadow-[var(--accent)]/25"
                  onClick={() => trackConversionEvent('cta_whatsapp_click', { placement: 'hero_slot' })}
                >
                  Amankan Slot Sekarang
                </a>
                <a
                  href="#tryout"
                  className="btn-secondary px-6 py-3 rounded-full font-semibold text-sm text-center border-2 border-[var(--accent)] text-[var(--accent)]"
                  onClick={(event) => {
                    handleAnchorClick(event, '#tryout')
                    trackConversionEvent('cta_tryout_click', { placement: 'hero' })
                  }}
                >
                  Coba Tryout Gratis Dulu
                </a>
                <a
                  href={REGISTER_URL}
                  className="text-center px-4 py-2 text-sm font-semibold text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
                  onClick={() => trackConversionEvent('cta_register_click', { placement: 'hero_secondary' })}
                >
                  Atau daftar akun →
                </a>
              </div>

            </div>

            <div className="order-2 reveal">
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
                        alt="Video Pembelajaran Fansedu - OSN Informatika, Matematika SMP & SD"
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
                        alt="Fansedu OSN Training - Informatika, Matematika SMP & SD"
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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <p className="text-center text-sm font-semibold text-[var(--fg-muted)] uppercase tracking-wide mb-8 reveal">
            Dipercaya peserta &amp; pembimbing SD, SMP, SMA dari berbagai kota
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '150+', label: 'siswa aktif di platform' },
              { value: '3+', label: 'batch sukses berjalan' },
              { value: '2x', label: 'tryout nasional per batch' },
              { value: 'sejak 2014', label: 'pengalaman bimbingan OSN' },
            ].map((item) => (
              <div key={item.label} className="reveal">
                <div className="font-display font-bold text-3xl sm:text-4xl text-[var(--accent)] mb-1">{item.value}</div>
                <div className="text-sm text-[var(--fg-muted)]">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tryout" className="py-24 relative bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 relative">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-4 reveal reveal-delay-1">
              Belum yakin? <span className="text-[var(--accent)]">Coba Tryout OSN Gratis</span> dulu
            </h2>
            <p className="text-[var(--fg-muted)] text-lg reveal reveal-delay-2 mb-10">
              Tanpa biaya — kamu langsung dapat gambaran nyata soal OSN dan posisimu di tingkat nasional.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 lg:gap-6 text-left reveal reveal-delay-2">
              {[
                {
                  title: 'Tes level kemampuan',
                  desc: 'Soal format OSN dengan pembatas waktu — lihat seberapa jauh fondasimu.',
                },
                {
                  title: 'Ranking nasional',
                  desc: 'Peringkat di leaderboard membandingkanmu dengan peserta dari berbagai daerah.',
                },
                {
                  title: 'Analisis kelemahan',
                  desc: 'Dari hasil tryout, kamu tahu bagian mana yang masih perlu dilatih lagi.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="feature-card rounded-2xl p-5 lg:p-6 flex gap-4 border border-[var(--border)]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center flex-shrink-0" aria-hidden={true}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-[var(--fg)] mb-1.5 leading-snug">{item.title}</h3>
                    <p className="text-sm text-[var(--fg-muted)] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-4 reveal">Alur di platform</span>
            <h3 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[var(--fg)] mb-3 reveal reveal-delay-1">
              Mulai dari sini — <span className="text-[var(--accent)]">4 langkah</span> sampai hasil tryout
            </h3>
            <p className="text-[var(--fg-muted)] text-base sm:text-lg reveal reveal-delay-2">
              Daftar akun, ikut tryout format OSN, cek peringkat nasional, lalu pilih program yang cocok berdasarkan analisis hasilmu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { step: 1, title: 'Daftar akun', desc: 'Buat akun di platform Fansedu terlebih dahulu.' },
              { step: 2, title: 'Tryout gratis', desc: 'Dari dashboard siswa, daftar dan ikuti TryOut OSN format resmi.' },
              { step: 3, title: 'Lihat ranking', desc: 'Cek peringkatmu di leaderboard nasional.' },
              { step: 4, title: 'Analisis & kelas', desc: 'Pahami hasil lalu pilih program yang sesuai kebutuhanmu.' },
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
            <a
              href={REGISTER_URL}
              className="btn-primary px-8 py-4 rounded-full font-semibold inline-block text-lg shadow-lg shadow-[var(--accent)]/20"
              onClick={() => trackConversionEvent('cta_register_click', { placement: 'tryout' })}
            >
              Mulai Tryout Gratis
            </a>
            <p className="text-[var(--fg-muted)] text-sm mt-4">
              {authUser ? (
                <>
                  Sudah login?{' '}
                  <a
                    href={authUser.role === 'guru' ? `${LMS_BASE}/guru` : `${LMS_BASE}/student`}
                    className="text-[var(--accent)] font-medium hover:underline"
                  >
                    Buka dashboard
                  </a>
                  {authUser.role === 'guru'
                    ? ' untuk mengakses fitur guru (termasuk tryout jika tersedia).'
                    : ' lalu buka menu Tryout dari sana.'}
                </>
              ) : (
                <>
                  Sudah punya akun?{' '}
                  <a href={`${LMS_BASE}/auth`} className="text-[var(--accent)] font-medium hover:underline">
                    Masuk
                  </a>
                  , lalu buka menu Tryout di dashboard.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <section id="masalah" className="py-24 relative bg-[var(--bg)] border-y border-[var(--border)]">
        <div className="absolute inset-0 grid-bg opacity-30"></div>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-sm font-semibold text-red-700 dark:text-red-300 mb-6 reveal">Kenapa banyak siswa gagal OSN?</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
              Bukan karena tidak pintar — <span className="text-[var(--accent)]">tapi karena ini</span>
            </h2>
            <p className="text-[var(--fg-muted)] text-lg reveal reveal-delay-2 max-w-2xl mx-auto">
              Banyak siswa gagal OSN (Informatika, Matematika SMP, maupun Matematika SD) bukan karena tidak pintar, tapi karena:
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4 mb-12">
            {[
              { t: 'Tidak tahu soal yang sering keluar', d: 'Belajar materi yang jarang muncul di seleksi — waktu habis sia-sia.' },
              { t: 'Tidak pernah tryout real', d: 'Baru kerasa sulitnya saat hari-H; tidak ada simulasi tekanan waktu & format resmi.' },
              { t: 'Belajar tanpa arah', d: 'Tanpa kurikulum dan feedback, sulit tahu apakah kamu sudah siap dibanding peserta lain.' },
            ].map((item, index) => (
              <div key={item.t} className={`feature-card rounded-2xl p-6 border-l-4 border-red-500/60 reveal reveal-delay-${(index % 3) + 1}`}>
                <h3 className="font-display font-semibold text-lg mb-2 flex items-center gap-2">
                  <span className="text-red-500 font-bold">❌</span> {item.t}
                </h3>
                <p className="text-[var(--fg-muted)] text-sm pl-7">{item.d}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-lg font-medium text-[var(--fg)] reveal">
            👉 Ini yang bikin frustrasi — dan bisa dihindari dengan persiapan yang tepat.
          </p>
        </div>
      </section>

      <section id="solusi" className="py-24 relative">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal">
                <div className="feature-card rounded-3xl p-8 lg:p-12 h-full flex flex-col items-center justify-center text-center">
                  <img src="/fansedu.png" alt="Fansedu logo" className="w-40 sm:w-48 rounded-2xl mb-6" />
                  <h2 className="font-display font-bold text-2xl lg:text-3xl">Transformasi bersama Fansedu</h2>
                  <p className="text-sm text-[var(--fg-muted)] mt-3">Dari belajar random → jalur terukur menuju OSN</p>
                </div>
            </div>

            <div>
              <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">
                Hasil yang kamu dapat
              </span>

              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
                Dengan Fansedu, <span className="text-[var(--accent)]">kamu akan</span>
              </h2>

              <ul className="space-y-3 mb-8 reveal reveal-delay-2">
                {[
                  'Paham pola soal OSN bidang yang kamu pilih',
                  'Terbiasa dengan soal real & tekanan tryout nasional',
                  'Tahu posisi kemampuanmu (ranking nasional)',
                  'Siap menghadapi seleksi dari tingkat sekolah hingga nasional',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[var(--fg)] text-lg">
                    <span className="text-[var(--accent)] font-bold shrink-0">✔</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-[var(--fg-muted)] mb-2 reveal reveal-delay-3 text-sm">
                Tim pengajar: <strong className="text-[var(--fg)]">Alumni OSN Informatika &amp; Matematika</strong>, praktisi dari <strong className="text-[var(--fg)]">Tokopedia</strong> &amp; <strong className="text-[var(--fg)]">Govtech Indonesia</strong> — materi disetel khusus per bidang OSN.
              </p>
            </div>
          </div>

        </div>
      </section>

      <section id="features" className="py-24 relative bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">Apa yang kamu dapat</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
              Program kelas — <span className="text-[var(--accent)]">bukan sekadar video</span>
            </h2>
            <p className="text-[var(--fg-muted)] text-lg reveal reveal-delay-2">Fasilitas yang mendukung kamu dari latihan sampai evaluasi nasional.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {[
              ['Pembahasan solusi mendalam sesuai bidang', 'Setiap soal dibahas step-by-step: algoritma untuk Informatika, pembuktian dan strategi untuk Matematika SMP/SD — bukan sekadar jawaban singkat.'],
              ['Akses materi & rekaman kapan saja', 'Fleksibilitas penuh mengakses materi, rekaman kelas, dan pembahasan sesuai jadwal kamu.'],
              ['Kurikulum dari praktisi & alumni OSN', 'Materi disusun oleh alumni OSN berpengalaman per bidang, fokus ke topik yang sering keluar di seleksi nyata.'],
              ['Mentor medalis & pelatih OSN', 'Medalis dan pelatih OSN Informatika serta Matematika — materi dan strategi disesuaikan khusus per bidang kompetisi.'],
              ['Rekaman kelas & pembahasan tanpa batas', 'Akses semua rekaman live class dan video pembahasan soal tanpa batas waktu.'],
              ['Investasi tepat untuk persiapan OSN', 'Nilai terbaik untuk hasil maksimal: dari fondasi dasar sampai siap menghadapi seleksi OSN di tingkat manapun.'],
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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            {promoCountdown.ended ? (
              <>
                <span className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-[var(--fg)] bg-[var(--card)] border-2 border-[var(--border)] shadow-sm mb-4 reveal">
                  <span aria-hidden={true}>📌</span>
                  <span>{URGENCY.promoLabel} sudah berakhir</span>
                </span>
                <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
                  Pilih program — <span className="text-[var(--accent)]">harga &amp; paket</span>
                </h2>
                <p className="text-[var(--fg-muted)] text-lg reveal reveal-delay-2 mb-2">
                  Harga di bawah (normal vs harga tertera) tetap bisa jadi acuan. Untuk <strong className="text-[var(--fg)]">diskon atau promo terbaru</strong>, hubungi tim Fansedu.
                </p>
                <a
                  href={waUrl(WA_TEMPLATES.promoBaru)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent)] font-semibold text-sm hover:underline reveal reveal-delay-2 inline-block mb-2"
                  onClick={() => trackConversionEvent('cta_whatsapp_click', { placement: 'packages_promo_ended' })}
                >
                  Tanya promo terbaru di WhatsApp →
                </a>
              </>
            ) : (
              <>
                <span className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 shadow-md ring-1 ring-black/15 dark:ring-white/25 mb-4 reveal">
                  <span className="text-base leading-none" aria-hidden={true}>⏳</span>
                  <span>{URGENCY.promoLabel} · slot terbatas</span>
                </span>
                <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
                  Pilih program — <span className="text-[var(--accent)]">harga promo aktif</span>
                </h2>
                <p className="text-[var(--fg-muted)] text-lg reveal reveal-delay-2 mb-2">
                  Harga normal dicoret di bawah. Pendaftaran{' '}
                  {promoCountdown.activeBatch === 1
                    ? <><strong className="text-[var(--fg)]">Batch 1 tutup {BATCH_DATES.batch1.closeDisplay}</strong>, lalu Batch 2 tutup {BATCH_DATES.batch2.closeDisplay}.</>
                    : <>tutup <strong className="text-[var(--fg)]">{BATCH_DATES.batch2.closeDisplay}</strong> atau sampai batch penuh.</>
                  }
                </p>
              </>
            )}
            <a href="#/catalog" className="text-[var(--accent)] font-medium text-sm hover:underline reveal reveal-delay-2">
              Lihat semua di Katalog →
            </a>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(packages.length > 0 ? packages : MOCK_PACKAGES).filter((p) => p.isOpen).map((pkg, index) => {
              const isBundle = pkg.isBundle === true
              const isPopular = pkg.slug === POPULAR_PROGRAM_SLUG
              const normalNum = isBundle && pkg.priceNormal ? pkg.priceNormal : 0
              const earlyNum = isBundle && pkg.priceEarlyBird ? pkg.priceEarlyBird : 0
              const hematRupiah = normalNum > 0 && earlyNum > 0 && normalNum > earlyNum
                ? formatRupiah(normalNum - earlyNum)
                : null
              return (
              <div key={pkg.id} className={`feature-card rounded-2xl p-8 flex flex-col reveal reveal-delay-${(index % 3) + 1} relative ${isBundle ? 'ring-2 ring-[var(--accent)] border-[var(--accent)]' : ''} ${isPopular ? 'ring-2 ring-amber-400/60 shadow-lg shadow-amber-500/10' : ''}`}>
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-[1] whitespace-nowrap px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-md">
                    Paling banyak dipilih
                  </span>
                )}
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
                  <span className="text-xs font-semibold text-[var(--fg)]">{BATCH_DATES.batch1.label}: {BATCH_DATES.batch1.period}</span>
                  <span className="text-[var(--fg-muted)]">·</span>
                  <span className="text-xs font-semibold text-[var(--fg)]">{BATCH_DATES.batch2.label}: {BATCH_DATES.batch2.period}</span>
                  <span className="text-[var(--fg-muted)]">·</span>
                  <span className="text-xs font-semibold text-[var(--fg)]">Kuota {URGENCY.quotaMax} siswa per kelas</span>
                  {getEarlyBirdDaysLeft() > 0 && (
                    <>
                      <span className="text-[var(--fg-muted)]">·</span>
                      <span className="text-xs font-semibold text-[var(--accent)]">Early bird hingga {urgencyDateLabel}</span>
                    </>
                  )}
                </div>
                <div className="mt-auto pt-4 border-t border-[var(--border)]">
                  {(pkg.priceEarlyBird != null || pkg.priceNormal != null || pkg.price > 0) && (
                    <div className="mb-4">
                      {isBundle ? (
                        <>
                          <p className="font-semibold text-[var(--fg)] text-xs uppercase tracking-wide mb-2">Harga paket</p>
                          {pkg.priceNormal != null && (
                            <p className="text-lg text-[var(--fg-muted)] line-through decoration-2 mb-1">{formatRupiah(pkg.priceNormal)}</p>
                          )}
                          {pkg.priceEarlyBird != null && (
                            <p className="text-2xl sm:text-3xl font-bold text-[var(--accent)]">
                              {formatRupiah(pkg.priceEarlyBird)}
                              <span className="block sm:inline sm:ml-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                                {promoCountdown.ended ? '(harga tertera)' : `(${URGENCY.promoLabel})`}
                              </span>
                            </p>
                          )}
                          {hematRupiah && (
                            <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">Hemat {hematRupiah}</p>
                          )}
                          {!promoCountdown.ended ? (
                            <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-2">⏳ Tutup {promoCountdown.activeBatch === 1 ? BATCH_DATES.batch1.closeDisplay : BATCH_DATES.batch2.closeDisplay}</p>
                          ) : (
                            <p className="text-xs text-[var(--fg-muted)] mt-2">Promo periode ini sudah berakhir. Tanya WhatsApp untuk penawaran terbaru.</p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-[var(--fg)] text-xs uppercase tracking-wide mb-2">Investasi</p>
                          {pkg.priceNormal != null && (
                            <p className="text-lg text-[var(--fg-muted)] line-through decoration-2 mb-1">{formatRupiah(pkg.priceNormal)}</p>
                          )}
                          {pkg.priceEarlyBird != null && (
                            <p className="text-2xl sm:text-3xl font-bold text-[var(--accent)] leading-tight">
                              {formatRupiah(pkg.priceEarlyBird)}
                              <span className="block sm:inline sm:ml-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                                {promoCountdown.ended ? '(harga tertera)' : `(${URGENCY.promoLabel})`}
                              </span>
                            </p>
                          )}
                          {!promoCountdown.ended ? (
                            <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-2">⏳ Tutup {promoCountdown.activeBatch === 1 ? BATCH_DATES.batch1.closeDisplay : BATCH_DATES.batch2.closeDisplay}</p>
                          ) : (
                            <p className="text-xs text-[var(--fg-muted)] mt-2">Promo periode ini sudah berakhir. Tanya WhatsApp untuk penawaran terbaru.</p>
                          )}
                          {!pkg.priceEarlyBird && !pkg.priceNormal && pkg.price > 0 && (
                            <p className="font-semibold text-[var(--accent)] text-2xl">{formatRupiah(pkg.price)}</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <a
                      href={`#/program/${pkg.slug}`}
                      className="btn-primary px-6 py-3 rounded-full font-semibold text-center inline-block text-sm w-full"
                      onClick={() => trackConversionEvent('program_card_click', { programId: pkg.id, programSlug: pkg.slug, placement: 'landing_programs' })}
                    >
                      {pkg.ctaLabel || 'Lihat Detail / Daftar'}
                    </a>
                    {pkg.ctaUrl && (
                      <a
                        href={pkg.ctaUrl.startsWith('http') ? pkg.ctaUrl : pkg.ctaUrl}
                        target={pkg.ctaUrl.startsWith('http') ? '_blank' : undefined}
                        rel={pkg.ctaUrl.startsWith('http') ? 'noreferrer' : undefined}
                        className="btn-secondary px-6 py-3 rounded-full font-semibold text-center inline-block text-sm w-full border border-[var(--border)]"
                        onClick={() => trackConversionEvent('cta_whatsapp_click', { placement: 'program_card', programId: pkg.id, programSlug: pkg.slug })}
                      >
                        Tanya Program
                      </a>
                    )}
                  </div>
                </div>
              </div>
              )
            })}
          </div>

          {(packages.length > 0 ? packages : MOCK_PACKAGES).filter((p) => p.isOpen).length === 0 && (
            <p className="text-center text-[var(--fg-muted)] py-8">Belum ada program yang dibuka saat ini. Hubungi kami untuk informasi terbaru.</p>
          )}
        </div>
      </section>

      <section id="loss" className="py-20 relative bg-[var(--card)] border-y border-[var(--border)]">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-4 reveal">
            Jika tidak mulai sekarang, kamu akan:
          </h2>
          <ul className="text-left max-w-md mx-auto space-y-3 text-[var(--fg)] reveal">
            <li className="flex gap-3 items-start"><span className="text-red-500 font-bold shrink-0">❌</span> Ketinggalan batch — kuota kelas terbatas.</li>
            <li className="flex gap-3 items-start"><span className="text-red-500 font-bold shrink-0">❌</span> Kehilangan harga promo &amp; early bird.</li>
            <li className="flex gap-3 items-start"><span className="text-red-500 font-bold shrink-0">❌</span> Masuk seleksi OSN tanpa persiapan &amp; tryout real.</li>
          </ul>
          <p className="mt-8 text-[var(--fg-muted)] text-sm reveal">Satu langkah sekarang = arah jelas untuk OSN-K 2026.</p>
        </div>
      </section>

      <section id="bukti" className="py-24 relative bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 relative">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-4 reveal">Bukti nyata di platform</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[var(--fg)] reveal reveal-delay-1">
              Ranking, tryout, &amp; <span className="text-[var(--accent)]">progress siswa</span> di platform
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <div className="reveal">
              <div className="feature-card rounded-2xl overflow-hidden border-2 border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors">
                <button type="button" className="w-full aspect-video bg-[var(--bg-secondary)] relative block cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded-t-2xl" onClick={() => setLightboxImage({ src: '/leaderboard-to.png', alt: 'Screenshot leaderboard ranking nasional Fansedu' })}>
                  <img
                    src="/leaderboard-to.png"
                    alt="Screenshot leaderboard ranking nasional Fansedu"
                    className="w-full h-full object-cover object-top pointer-events-none"
                    onError={(e) => {
                      const t = e.currentTarget
                      if (!t.src.includes('placehold.co')) {
                        t.src = 'https://placehold.co/800x450/1e293b/c9fd02?text=Leaderboard+Nasional'
                      }
                    }}
                  />
                </button>
                <div className="p-4 text-center">
                  <p className="font-semibold text-[var(--fg)]">Hasil tryout &amp; ranking</p>
                  <p className="text-sm text-[var(--fg-muted)]">Peringkat nasional antar peserta</p>
                </div>
              </div>
            </div>
            <div className="reveal reveal-delay-1">
              <div className="feature-card rounded-2xl overflow-hidden border-2 border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors">
                <button type="button" className="w-full aspect-video bg-[var(--bg-secondary)] relative block cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded-t-2xl" onClick={() => setLightboxImage({ src: '/dashboard-siswa.png', alt: 'Screenshot dashboard peserta Fansedu' })}>
                  <img
                    src="/dashboard-siswa.png"
                    alt="Screenshot dashboard peserta Fansedu"
                    className="w-full h-full object-cover object-top pointer-events-none"
                    onError={(e) => {
                      const t = e.currentTarget
                      if (!t.src.includes('placehold.co')) {
                        t.src = 'https://placehold.co/800x450/1e293b/c9fd02?text=Dashboard+Peserta'
                      }
                    }}
                  />
                </button>
                <div className="p-4 text-center">
                  <p className="font-semibold text-[var(--fg)]">Progress siswa</p>
                  <p className="text-sm text-[var(--fg-muted)]">Akses materi &amp; aktivitas</p>
                </div>
              </div>
            </div>
            <div className="reveal reveal-delay-2">
              <div className="feature-card rounded-2xl overflow-hidden border-2 border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors">
                <button type="button" className="w-full aspect-video bg-[var(--bg-secondary)] relative block cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded-t-2xl" onClick={() => setLightboxImage({ src: '/kelas-osn.png', alt: 'Screenshot kelas dan materi OSN Fansedu' })}>
                  <img
                    src="/kelas-osn.png"
                    alt="Screenshot kelas dan materi OSN Fansedu"
                    className="w-full h-full object-cover object-top pointer-events-none"
                    onError={(e) => {
                      const t = e.currentTarget
                      if (!t.src.includes('placehold.co')) {
                        t.src = 'https://placehold.co/800x450/1e293b/c9fd02?text=Kelas+OSN'
                      }
                    }}
                  />
                </button>
                <div className="p-4 text-center">
                  <p className="font-semibold text-[var(--fg)]">Kelas &amp; materi OSN</p>
                  <p className="text-sm text-[var(--fg-muted)]">Sesi belajar terstruktur</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="testimoni" className="py-24 relative">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">Testimoni</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6 reveal reveal-delay-1">
              Apa Kata <span className="text-[var(--accent)]">Mereka?</span>
            </h2>
            <p className="text-[var(--fg-muted)] text-lg reveal reveal-delay-2">
              Kata mereka setelah ikut tryout &amp; kelas — plus cuplikan tampilan platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { quote: 'Awalnya takut C++ itu susah. Ternyata dengan cara ngajar di Foundation, saya ngerti dalam 2 minggu. Tryout-nya juga bikin saya sadar di mana posisi saya dibanding peserta lain.', author: 'Rizky A.', role: 'Siswa SMAN 3 Surabaya · Peserta Foundation', thumb: '/dashboard-siswa.png' },
              { quote: 'Materi di OSN-K sangat relevan dengan soal seleksi nyata. Mentor yang sudah berpengalaman OSN benar-benar tahu apa yang perlu difokuskan. Saya rekomendasikan ke semua guru pembimbing.', author: 'Pak Budi S.', role: 'Guru Pembimbing OSN · SMA Negeri Bandung', thumb: '/kelas-osn.png' },
              { quote: 'Dari tidak tahu struktur data sama sekali, sekarang saya bisa ikut tryout nasional dan masuk Top 20. Program ini benar-benar worth every penny.', author: 'Dimas F.', role: 'Siswa SMA · Peserta OSN-K, Ranking Top 20 Nasional', thumb: '/leaderboard-to.png' },
            ].map((item, index) => (
              <div key={index} className={`feature-card rounded-2xl overflow-hidden reveal reveal-delay-${(index % 3) + 1}`}>
                <button
                  type="button"
                  className="w-full h-28 sm:h-32 bg-[var(--bg-secondary)] relative block cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
                  onClick={() => setLightboxImage({ src: item.thumb, alt: `Cuplikan platform — ${item.role}` })}
                >
                  <img
                    src={item.thumb}
                    alt={`Cuplikan platform Fansedu — ${item.role}`}
                    className="w-full h-full object-cover object-top opacity-90 pointer-events-none"
                    onError={(e) => {
                      const t = e.currentTarget
                      if (!t.src.includes('placehold.co')) t.src = 'https://placehold.co/400x200/1e293b/c9fd02?text=Fansedu'
                    }}
                  />
                  <span className="absolute bottom-2 left-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-black/50 text-white">Cuplikan platform</span>
                </button>
                <div className="p-6">
                  <p className="text-[var(--fg)] mb-4 italic text-sm sm:text-base leading-relaxed">&ldquo;{item.quote}&rdquo;</p>
                  <div>
                    <div className="font-semibold text-[var(--fg)]">{item.author}</div>
                    <div className="text-sm text-[var(--fg-muted)]">{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="py-24 relative bg-gradient-to-b from-[var(--card)] to-[var(--bg-secondary)] border-b border-[var(--border)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 text-center">
          {promoCountdown.ended ? (
            <>
              <p className="text-[var(--fg-muted)] font-bold text-sm uppercase tracking-wide mb-3 reveal">Langkah berikutnya</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-4 reveal">
                Promo sudah berakhir — <span className="text-[var(--accent)]">kamu masih bisa daftar</span>
              </h2>
              <p className="text-[var(--fg-muted)] text-base mb-3 max-w-xl mx-auto reveal leading-relaxed">
                {URGENCY.promoLabel} yang berlaku hingga {URGENCY.promoEndDisplay} sudah tidak berlaku. Untuk mengetahui{' '}
                <strong className="text-[var(--fg)]">promo lain atau harga terkini</strong>, hubungi tim Fansedu.
              </p>
              <p className="text-[var(--fg-muted)] text-sm mb-8 max-w-lg mx-auto reveal">
                Kuota {URGENCY.batch} tetap terbatas — sekitar {URGENCY.slotsRemaining} slot tersisa. Amankan seat lewat WhatsApp atau daftar di web.
              </p>
            </>
          ) : (
            <>
              <p className="text-amber-700 dark:text-amber-300 font-bold text-sm uppercase tracking-wide mb-3 reveal">⚠️ {BATCH_DATES.batch1.label} hampir penuh</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-4 reveal">
                Promo &amp; slot <span className="text-[var(--accent)]">tidak nunggu</span>
              </h2>
              <p className="text-red-600 dark:text-red-400 font-semibold text-lg mb-2 reveal">🔥 Promo akan segera berakhir — jangan sampai ketinggalan.</p>
              <p className="text-[var(--fg-muted)] text-base mb-8 max-w-xl mx-auto reveal">
                {BATCH_DATES.batch1.label} ({BATCH_DATES.batch1.period}) hampir penuh. {BATCH_DATES.batch2.label} ({BATCH_DATES.batch2.period}) masih tersedia — hanya ~{URGENCY.slotsRemaining} kursi tersisa.
              </p>
            </>
          )}

          <div className="flex flex-wrap justify-center gap-3 mb-10 reveal">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--bg)] border border-[var(--border)] text-sm font-medium text-[var(--fg)]">
              📅 {BATCH_DATES.batch1.label}: {BATCH_DATES.batch1.period}
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--bg)] border border-[var(--border)] text-sm font-medium text-[var(--fg)]">
              📅 {BATCH_DATES.batch2.label}: {BATCH_DATES.batch2.period}
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--bg)] border border-[var(--border)] text-sm font-medium text-[var(--fg)]">
              👥 Kuota {URGENCY.quotaMax} siswa per kelas
            </span>
            {!promoCountdown.ended && (
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-red-500/15 border border-red-500/40 text-sm font-bold text-red-700 dark:text-red-300 tabular-nums">
                ⏳ {promoCountdown.timer}
              </span>
            )}
            {getEarlyBirdDaysLeft() > 0 && (
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/40 text-sm font-semibold text-[var(--accent)]">
                Early bird hingga {urgencyDateLabel}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 reveal">
            <a
              href={waUrl(promoCountdown.ended ? WA_TEMPLATES.promoBaru : WA_TEMPLATES.heroSlot)}
              target="_blank"
              rel="noreferrer"
              className="btn-primary px-8 py-3 rounded-full font-semibold text-sm inline-block shadow-lg shadow-[var(--accent)]/25"
              onClick={() =>
                trackConversionEvent('cta_whatsapp_click', {
                  placement: promoCountdown.ended ? 'cta_bottom_promo_baru' : 'cta_bottom_slot',
                })
              }
            >
              {promoCountdown.ended ? 'Tanya promo terbaru (WhatsApp)' : 'Amankan Slot Sekarang'}
            </a>
            <a
              href="#tryout"
              className="btn-secondary px-8 py-3 rounded-full font-semibold text-sm inline-block border-2 border-[var(--accent)] text-[var(--accent)]"
              onClick={(e) => {
                handleAnchorClick(e, '#tryout')
                trackConversionEvent('cta_tryout_click', { placement: 'cta_bottom' })
              }}
            >
              Ikut Tryout Gratis
            </a>
            <a
              href={authUser ? `${LMS_BASE}/catalog` : REGISTER_URL}
              className="px-8 py-3 rounded-full font-semibold text-sm inline-block text-[var(--fg-muted)] hover:text-[var(--accent)]"
              onClick={() => trackConversionEvent('cta_register_click', { placement: 'cta_bottom' })}
            >
              Daftar lewat web →
            </a>
          </div>
        </div>
      </section>

      <section id="articles" className="py-24 relative bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 relative">
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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 relative">
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
              onClick={() => trackConversionEvent('cta_whatsapp_click', { placement: 'request' })}
            >
              Kirim Request
            </a>
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 relative bg-[var(--bg)] border-t border-[var(--border)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] mb-6 reveal">FAQ</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-4 reveal reveal-delay-1">
              Pertanyaan yang <span className="text-[var(--accent)]">Sering Ditanya</span>
            </h2>
            <p className="text-[var(--fg-muted)] text-lg reveal reveal-delay-2">
              Belum ketemu jawabannya? Tanya langsung ke tim kami via WhatsApp.
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-3 reveal">
            {FAQ_ITEMS.map((item, index) => (
              <div key={index} className="feature-card rounded-2xl border border-[var(--border)] overflow-hidden">
                <button
                  type="button"
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-[var(--surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
                  onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                  aria-expanded={faqOpen === index}
                >
                  <span className="font-display font-semibold text-[var(--fg)] text-left leading-snug">{item.q}</span>
                  <svg
                    className={`w-5 h-5 flex-shrink-0 text-[var(--accent)] transition-transform duration-200 ${faqOpen === index ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {faqOpen === index && (
                  <div className="px-6 pb-5 text-[var(--fg-muted)] text-sm leading-relaxed border-t border-[var(--border)]">
                    <p className="pt-4">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-10 reveal">
            <a
              href={waUrl(WA_TEMPLATES.contact)}
              target="_blank"
              rel="noreferrer"
              className="btn-primary px-8 py-3 rounded-full font-semibold text-sm inline-block"
              onClick={() => trackConversionEvent('cta_whatsapp_click', { placement: 'faq' })}
            >
              Masih ada pertanyaan? Chat di WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section id="contact" className="py-24 relative bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 relative">
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
                  Jangan biarkan kesempatan berlalu. Persiapkan diri dengan program pelatihan terbaik — OSN Informatika, Matematika SMP, atau Matematika SD.
                </p>
                <a
                  href={waUrl(WA_TEMPLATES.contact)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary px-8 py-4 rounded-full font-semibold text-center inline-block"
                  onClick={() => trackConversionEvent('cta_whatsapp_click', { placement: 'contact' })}
                >
                  Hubungi Kami Sekarang
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-[var(--border)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <a href="#hero" className="flex items-center gap-3 mb-4" onClick={(event) => handleAnchorClick(event, '#hero')}>
                <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                  <span className="font-display font-bold text-white text-lg">F</span>
                </div>
                <span className="font-display font-semibold text-xl">Fansedu OSN Training</span>
              </a>
              <p className="text-[var(--fg-muted)] max-w-sm">
                Platform pelatihan OSN terpercaya untuk siswa SD, SMP, dan SMA. Tersedia program OSN Informatika, OSN Matematika SMP, dan OSN Matematika SD.
              </p>
            </div>

            <div>
              <h4 className="font-display font-semibold mb-4">Navigasi</h4>
              <nav className="flex flex-col gap-2">
                <a href="#tryout" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#tryout')}>
                  Tryout Gratis
                </a>
                <a href="#packages" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#packages')}>
                  Program &amp; Harga
                </a>
                <a href="#solusi" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#solusi')}>
                  Hasil
                </a>
                <a href="#features" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#features')}>
                  Fitur
                </a>
                <a href="#bukti" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#bukti')}>
                  Bukti Nyata
                </a>
                <a href="#testimoni" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#testimoni')}>
                  Testimoni
                </a>
                <a href="#request" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#request')}>
                  Request Bidang
                </a>
                <a href="#faq" className="nav-link text-sm" onClick={(event) => handleAnchorClick(event, '#faq')}>
                  FAQ
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

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Tampilan gambar diperbesar"
          onClick={() => setLightboxImage(null)}
        >
          <button type="button" className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white" onClick={() => setLightboxImage(null)} aria-label="Tutup">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              const t = e.currentTarget
              if (!t.src.includes('placehold.co')) t.src = 'https://placehold.co/800x450/1e293b/c9fd02?text=Gambar'
            }}
          />
        </div>
      )}

      <a
        href={waUrl(WA_TEMPLATES.float)}
        target="_blank"
        rel="noreferrer"
        className="wa-float"
        aria-label="Chat via WhatsApp"
        onClick={() => trackConversionEvent('cta_whatsapp_click', { placement: 'floating' })}
      >
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      <div className="sticky-cta-mobile fixed bottom-0 left-0 right-0 z-[900] md:hidden safe-area-pb flex shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
        <a
          href="#tryout"
          className="flex-1 py-3.5 px-3 text-center font-semibold text-sm bg-[var(--card)] text-[var(--accent)] border-t border-[var(--border)]"
          onClick={(e) => {
            handleAnchorClick(e, '#tryout')
            trackConversionEvent('cta_tryout_click', { placement: 'sticky_mobile' })
          }}
        >
          Tryout gratis
        </a>
        <a
          href={waUrl(WA_TEMPLATES.heroSlot)}
          target="_blank"
          rel="noreferrer"
          className="flex-[1.4] py-3.5 px-3 text-center font-semibold text-sm text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
          onClick={() => trackConversionEvent('cta_whatsapp_click', { placement: 'sticky_mobile_slot' })}
        >
          Amankan slot
        </a>
      </div>
    </div>
  )
}

export default App

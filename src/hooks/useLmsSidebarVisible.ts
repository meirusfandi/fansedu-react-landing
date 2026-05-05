import { useCallback, useEffect, useState } from 'react'

export type LmsSidebarRole = 'student' | 'guru'

/** Selaras dengan breakpoint `md` Tailwind (lebar ≥ ini dianggap desktop). */
const SIDEBAR_DESKTOP_MEDIA = '(min-width: 768px)'

function storageKey(role: LmsSidebarRole): string {
  return `fansedu:lms-sidebar-${role}`
}

function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia(SIDEBAR_DESKTOP_MEDIA).matches
}

function readInitialSidebarVisible(role: LmsSidebarRole): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = sessionStorage.getItem(storageKey(role))
    if (raw === '0') return false
    if (raw === '1') return true
  } catch {
    /* ignore */
  }
  /* Belum ada preferensi: mobile default tertutup, desktop default terbuka. */
  return isDesktopViewport()
}

/**
 * Sidebar dashboard siswa/guru: bisa disembunyikan; preferensi disimpan di sessionStorage.
 * Di layar sempit (di bawah lebar `md` / 768px), default tertutup agar konten utama dapat ruang penuh.
 */
export function useLmsSidebarVisible(role: LmsSidebarRole) {
  const [visible, setVisible] = useState(() => readInitialSidebarVisible(role))

  useEffect(() => {
    setVisible(readInitialSidebarVisible(role))
  }, [role])

  /** Tanpa preferensi tersimpan: ikuti lebar viewport (mis. DevTools responsif). */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(SIDEBAR_DESKTOP_MEDIA)
    const onViewportChange = () => {
      try {
        const raw = sessionStorage.getItem(storageKey(role))
        if (raw === '0' || raw === '1') return
      } catch {
        /* ignore */
      }
      setVisible(mq.matches)
    }
    mq.addEventListener('change', onViewportChange)
    return () => mq.removeEventListener('change', onViewportChange)
  }, [role])

  const persist = useCallback((next: boolean) => {
    try {
      sessionStorage.setItem(storageKey(role), next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [role])

  const setSidebarVisible = useCallback(
    (next: boolean) => {
      setVisible(next)
      persist(next)
    },
    [persist],
  )

  const toggleSidebar = useCallback(() => {
    setVisible((prev) => {
      const next = !prev
      persist(next)
      return next
    })
  }, [persist])

  return { sidebarVisible: visible, setSidebarVisible, toggleSidebar }
}

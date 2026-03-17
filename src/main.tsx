import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ArticleDetailPage from './pages/ArticleDetail.tsx'
import TryoutListPage from './pages/TryoutListPage.tsx'
import TryoutInfoPage from './pages/TryoutInfo.tsx'
import TryoutLeaderboardPage from './pages/TryoutLeaderboard.tsx'
import LMSApp, { parseLmsRoute } from './pages/lms/LMSApp.tsx'

const LMS_PATHS = /^\/(auth|catalog|program(\/[^/]*)?|checkout(\/(success|confirm))?|student(\/[^?]*)?|instructor(\/[^/]*)?)(\?|$)/

function parseHash(): { route: 'home' | 'article' | 'tryout' | 'tryout-info' | 'leaderboard' | 'lms'; slug: string | null; tryoutId: string | null; lmsPath?: string } {
  const hash = window.location.hash.slice(1) || '/'
  const path = hash.startsWith('/') ? hash : `/${hash}`
  if (LMS_PATHS.test(path.split('?')[0])) {
    return { route: 'lms', slug: null, tryoutId: null, lmsPath: path }
  }
  const leaderboardMatch = path.match(/^\/leaderboard\/([^/]+)/)
  if (leaderboardMatch) return { route: 'leaderboard', slug: null, tryoutId: leaderboardMatch[1] }
  if (path === '/leaderboard') return { route: 'leaderboard', slug: null, tryoutId: null }
  if (path === '/tryout') return { route: 'tryout', slug: null, tryoutId: null }
  const tryoutInfoMatch = path.match(/^\/tryout-info\/([^/]+)/)
  if (tryoutInfoMatch) return { route: 'tryout-info', slug: null, tryoutId: tryoutInfoMatch[1] }
  if (path === '/tryout-info') return { route: 'tryout-info', slug: null, tryoutId: null }
  const match = path.match(/^\/artikel\/([^/]+)/)
  if (match) return { route: 'article', slug: match[1], tryoutId: null }
  return { route: 'home', slug: null, tryoutId: null }
}

function Root() {
  const [location, setLocation] = useState(parseHash)

  useEffect(() => {
    const onHashChange = () => setLocation(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // TikTok Pixel: track virtual page views on hash change (SPA)
  useEffect(() => {
    const ttq = (window as Window & { ttq?: { page: () => void } }).ttq
    ttq?.page()
  }, [location.route, location.slug])

  if (location.route === 'leaderboard') return <TryoutLeaderboardPage tryoutId={location.tryoutId} />
  if (location.route === 'tryout') return <TryoutListPage />
  if (location.route === 'tryout-info') return <TryoutInfoPage tryoutId={location.tryoutId} />
  if (location.route === 'article' && location.slug) {
    return <ArticleDetailPage slug={location.slug} />
  }
  if (location.route === 'lms' && location.lmsPath) {
    const lmsRoute = parseLmsRoute(location.lmsPath)
    if (lmsRoute) return <LMSApp route={lmsRoute} />
  }
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

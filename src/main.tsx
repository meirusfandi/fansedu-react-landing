import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ArticleDetailPage from './pages/ArticleDetail.tsx'
import TryoutInfoPage from './pages/TryoutInfo.tsx'
import TryoutLeaderboardPage from './pages/TryoutLeaderboard.tsx'

function parseHash(): { route: 'home' | 'article' | 'tryout-info' | 'leaderboard'; slug: string | null } {
  const hash = window.location.hash.slice(1) || '/'
  const path = hash.startsWith('/') ? hash : `/${hash}`
  if (path === '/leaderboard') return { route: 'leaderboard', slug: null }
  if (path === '/tryout-info') return { route: 'tryout-info', slug: null }
  const match = path.match(/^\/artikel\/([^/]+)/)
  if (match) return { route: 'article', slug: match[1] }
  return { route: 'home', slug: null }
}

function Root() {
  const [location, setLocation] = useState(parseHash)

  useEffect(() => {
    const onHashChange = () => setLocation(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (location.route === 'leaderboard') return <TryoutLeaderboardPage />
  if (location.route === 'tryout-info') return <TryoutInfoPage />
  if (location.route === 'article' && location.slug) {
    return <ArticleDetailPage slug={location.slug} />
  }
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

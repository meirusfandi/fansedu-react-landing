import { lazy, Suspense } from 'react'
import type { LmsRoute } from './lmsRoutes'
import { isGuruLmsRoute, isStudentLmsRoute } from './lmsRoutes'

const LmsPublicRoutes = lazy(() => import('./LmsPublicRoutes'))
const LmsStudentRoutes = lazy(() => import('./LmsStudentRoutes'))
const LmsGuruRoutes = lazy(() => import('./LmsGuruRoutes'))

const lmsSuspenseFallback = (
  <div className="min-h-[40vh] flex items-center justify-center text-gray-500 text-sm">Memuat…</div>
)

function LmsRouteView({ route }: { route: LmsRoute }) {
  if (isStudentLmsRoute(route.type)) return <LmsStudentRoutes route={route} />
  if (isGuruLmsRoute(route.type)) return <LmsGuruRoutes route={route} />
  return <LmsPublicRoutes route={route} />
}

/**
 * Shell LMS: lazy-load chunk publik / siswa / guru sesuai rute.
 * Modul ini ringan; layout & dashboard berat tidak ikut bundle landing (lihat main + `lmsRoutes`).
 */
export default function LMSApp({ route }: { route: LmsRoute }) {
  return (
    <Suspense fallback={lmsSuspenseFallback}>
      <LmsRouteView route={route} />
    </Suspense>
  )
}

export type { LmsRoute } from './lmsRoutes'
export { parseLmsRoute } from './lmsRoutes'

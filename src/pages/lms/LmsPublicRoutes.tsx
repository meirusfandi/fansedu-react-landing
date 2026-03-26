import type { LmsRoute } from './lmsRoutes'
import AuthPage from './AuthPage'
import CatalogPage from './CatalogPage'
import ProgramDetailPage from './ProgramDetailPage'
import CheckoutPage from './CheckoutPage'
import CheckoutConfirmPage from './CheckoutConfirmPage'
import CheckoutSuccessPage from './CheckoutSuccessPage'

/** Rute LMS tanpa layout siswa/guru (auth, katalog, checkout, dll.). */
export default function LmsPublicRoutes({ route }: { route: LmsRoute }) {
  switch (route.type) {
    case 'auth':
      return (
        <AuthPage redirect={route.authRedirect ?? ''} tab={route.authTab} />
      )
    case 'catalog':
      return <CatalogPage />
    case 'program':
      return route.programSlug ? <ProgramDetailPage slug={route.programSlug} /> : null
    case 'checkout':
      return <CheckoutPage programSlug={route.checkoutProgramSlug ?? null} />
    case 'checkout-confirm':
      return <CheckoutConfirmPage orderId={route.checkoutConfirmOrderId ?? null} />
    case 'checkout-success':
      return <CheckoutSuccessPage />
    default:
      return null
  }
}

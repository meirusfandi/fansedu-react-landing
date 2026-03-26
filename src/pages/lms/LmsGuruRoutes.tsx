import type { LmsRoute } from './lmsRoutes'
import { GuruLayout } from './GuruLayout'
import CheckoutConfirmPage from './CheckoutConfirmPage'
import GuruDashboardPage from './GuruDashboardPage'
import GuruCoursesPage from './GuruCoursesPage'
import GuruStudentsPage from './GuruStudentsPage'
import GuruStudentDetailPage from './GuruStudentDetailPage'
import GuruTransactionsPage from './GuruTransactionsPage'
import GuruEarningsPage from './GuruEarningsPage'
import GuruProfilePage from './GuruProfilePage'
import GuruTryoutsPage from './GuruTryoutsPage'
import GuruTryoutAnalysisPage from './GuruTryoutAnalysisPage'
import GuruAttemptAIAnalysisPage from './GuruAttemptAIAnalysisPage'
import GuruTryoutStudentDetailPage from './GuruTryoutStudentDetailPage'
import TryoutLeaderboardPage from './TryoutLeaderboardPage'

/** Dashboard & halaman guru — chunk terpisah, tidak diunduh di landing. */
export default function LmsGuruRoutes({ route }: { route: LmsRoute }) {
  switch (route.type) {
    case 'guru':
      return (
        <GuruLayout currentPath="/guru">
          <GuruDashboardPage />
        </GuruLayout>
      )
    case 'guru-courses':
      return (
        <GuruLayout currentPath="/guru/courses">
          <GuruCoursesPage />
        </GuruLayout>
      )
    case 'guru-students':
      return (
        <GuruLayout currentPath="/guru/students">
          <GuruStudentsPage />
        </GuruLayout>
      )
    case 'guru-student-detail':
      return (
        <GuruLayout currentPath="/guru/students">
          <GuruStudentDetailPage studentId={route.guruStudentId ?? ''} />
        </GuruLayout>
      )
    case 'guru-transactions':
      return (
        <GuruLayout currentPath="/guru/transactions">
          <GuruTransactionsPage />
        </GuruLayout>
      )
    case 'guru-checkout-confirm':
      return (
        <GuruLayout currentPath="/guru/transactions">
          <CheckoutConfirmPage orderId={route.checkoutConfirmOrderId ?? null} embedded scope="guru" />
        </GuruLayout>
      )
    case 'guru-earnings':
      return (
        <GuruLayout currentPath="/guru/earnings">
          <GuruEarningsPage />
        </GuruLayout>
      )
    case 'guru-profile':
      return (
        <GuruLayout currentPath="/guru/profile">
          <GuruProfilePage />
        </GuruLayout>
      )
    case 'guru-tryouts':
      return (
        <GuruLayout currentPath="/guru/tryouts">
          <GuruTryoutsPage />
        </GuruLayout>
      )
    case 'guru-leaderboard':
      return (
        <GuruLayout currentPath="/guru/tryouts">
          <TryoutLeaderboardPage tryoutId={route.guruTryoutId ?? ''} role="guru" />
        </GuruLayout>
      )
    case 'guru-tryout-analysis':
      return (
        <GuruLayout currentPath="/guru/tryouts">
          <GuruTryoutAnalysisPage tryoutId={route.guruTryoutId ?? ''} />
        </GuruLayout>
      )
    case 'guru-tryout-student-detail':
      return (
        <GuruLayout currentPath="/guru/tryouts">
          <GuruTryoutStudentDetailPage tryoutId={route.guruTryoutId ?? ''} studentId={route.guruStudentId ?? ''} />
        </GuruLayout>
      )
    case 'guru-attempt-ai':
      return (
        <GuruLayout currentPath="/guru/tryouts">
          <GuruAttemptAIAnalysisPage tryoutId={route.guruTryoutId ?? ''} attemptId={route.guruAttemptId ?? ''} />
        </GuruLayout>
      )
    default:
      return null
  }
}

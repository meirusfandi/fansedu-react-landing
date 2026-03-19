import AuthPage from './AuthPage'
import CatalogPage from './CatalogPage'
import ProgramDetailPage from './ProgramDetailPage'
import CheckoutPage from './CheckoutPage'
import CheckoutConfirmPage from './CheckoutConfirmPage'
import CheckoutSuccessPage from './CheckoutSuccessPage'
import { StudentLayout } from './StudentLayout'
import StudentDashboardPage from './StudentDashboardPage'
import StudentCoursesPage from './StudentCoursesPage'
import StudentCodingPage from './StudentCodingPage'
import StudentTryoutPage from './StudentTryoutPage'
import StudentTryoutDetailPage from './StudentTryoutDetailPage'
import StudentCodingProblemPage from './StudentCodingProblemPage'
import StudentTransactionsPage from './StudentTransactionsPage'
import StudentCertificatesPage from './StudentCertificatesPage'
import StudentProfilePage from './StudentProfilePage'
import { InstructorLayout } from './InstructorLayout'
import InstructorDashboardPage from './InstructorDashboardPage'
import InstructorCoursesPage from './InstructorCoursesPage'
import InstructorStudentsPage from './InstructorStudentsPage'
import InstructorEarningsPage from './InstructorEarningsPage'
import InstructorProfilePage from './InstructorProfilePage'
import InstructorTryoutsPage from './InstructorTryoutsPage'
import InstructorTryoutAnalysisPage from './InstructorTryoutAnalysisPage'
import InstructorAttemptAIAnalysisPage from './InstructorAttemptAIAnalysisPage'

export interface LmsRoute {
  type: 'auth' | 'catalog' | 'program' | 'checkout' | 'checkout-confirm' | 'checkout-success' | 'student' | 'student-courses' | 'student-tryout' | 'student-tryout-detail' | 'student-coding' | 'student-coding-problem' | 'student-transactions' | 'student-certificates' | 'student-profile' | 'instructor' | 'instructor-courses' | 'instructor-students' | 'instructor-earnings' | 'instructor-profile' | 'instructor-tryouts' | 'instructor-tryout-analysis' | 'instructor-attempt-ai'
  programSlug?: string
  authRedirect?: string
  authTab?: string
  checkoutProgramSlug?: string
  checkoutConfirmOrderId?: string
  codingProblemSlug?: string
  studentTryoutId?: string
  studentPath?: string
  instructorPath?: string
  instructorTryoutId?: string
  instructorAttemptId?: string
}

export function parseLmsRoute(hashPath: string): LmsRoute | null {
  const path = hashPath.startsWith('/') ? hashPath : `/${hashPath}`
  const pathOnly = path.includes('?') ? path.slice(0, path.indexOf('?')) : path
  const queryString = path.includes('?') ? path.slice(path.indexOf('?') + 1) : ''
  const query = new URLSearchParams(queryString)

  if (pathOnly === '/auth') {
    return { type: 'auth', authRedirect: query.get('redirect') || '#/', authTab: query.get('tab') || 'login' }
  }
  if (pathOnly === '/catalog') return { type: 'catalog' }
  // /program atau /program/ tanpa slug → katalog
  if (pathOnly === '/program' || pathOnly === '/program/') return { type: 'catalog' }
  const programMatch = pathOnly.match(/^\/program\/([^/]+)$/)
  if (programMatch) return { type: 'program', programSlug: programMatch[1] }
  if (pathOnly === '/checkout/success') return { type: 'checkout-success' }
  if (pathOnly === '/checkout/confirm') return { type: 'checkout-confirm', checkoutConfirmOrderId: query.get('order') || undefined }
  if (pathOnly === '/checkout') {
    const slug = query.get('program') || query.get('course')
    return { type: 'checkout', checkoutProgramSlug: slug || undefined }
  }
  if (pathOnly === '/student') return { type: 'student', studentPath: '/student' }
  if (pathOnly === '/student/courses') return { type: 'student-courses', studentPath: '/student/courses' }
  if (pathOnly === '/student/tryout') return { type: 'student-tryout', studentPath: '/student/tryout' }
  const studentTryoutDetailMatch = pathOnly.match(/^\/student\/tryout\/([^/]+)$/)
  if (studentTryoutDetailMatch) return { type: 'student-tryout-detail', studentTryoutId: studentTryoutDetailMatch[1], studentPath: '/student/tryout' }
  if (pathOnly === '/student/coding') return { type: 'student-coding', studentPath: '/student/coding' }
  const codingProblemMatch = pathOnly.match(/^\/student\/coding\/problem\/([^/]+)$/)
  if (codingProblemMatch) return { type: 'student-coding-problem', codingProblemSlug: codingProblemMatch[1], studentPath: '/student/coding' }
  if (pathOnly === '/student/transactions') return { type: 'student-transactions', studentPath: '/student/transactions' }
  if (pathOnly === '/student/certificates') return { type: 'student-certificates', studentPath: '/student/certificates' }
  if (pathOnly === '/student/profile') return { type: 'student-profile', studentPath: '/student/profile' }
  if (pathOnly === '/instructor') return { type: 'instructor', instructorPath: '/instructor' }
  if (pathOnly === '/instructor/courses') return { type: 'instructor-courses', instructorPath: '/instructor/courses' }
  if (pathOnly === '/instructor/students') return { type: 'instructor-students', instructorPath: '/instructor/students' }
  if (pathOnly === '/instructor/earnings') return { type: 'instructor-earnings', instructorPath: '/instructor/earnings' }
  if (pathOnly === '/instructor/profile') return { type: 'instructor-profile', instructorPath: '/instructor/profile' }
  if (pathOnly === '/instructor/tryouts') return { type: 'instructor-tryouts', instructorPath: '/instructor/tryouts' }
  const tryoutAnalysisMatch = pathOnly.match(/^\/instructor\/tryouts\/([^/]+)\/?$/)
  if (tryoutAnalysisMatch) return { type: 'instructor-tryout-analysis', instructorTryoutId: tryoutAnalysisMatch[1], instructorPath: '/instructor/tryouts' }
  const attemptAiMatch = pathOnly.match(/^\/instructor\/tryouts\/([^/]+)\/attempts\/([^/]+)\/ai-analysis\/?$/)
  if (attemptAiMatch) return { type: 'instructor-attempt-ai', instructorTryoutId: attemptAiMatch[1], instructorAttemptId: attemptAiMatch[2], instructorPath: '/instructor/tryouts' }
  return null
}

export default function LMSApp({ route }: { route: LmsRoute }) {
  switch (route.type) {
    case 'auth':
      return <AuthPage redirect={route.authRedirect ?? '#/'} tab={route.authTab} />
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
    case 'student':
      return (
        <StudentLayout currentPath="/student">
          <StudentDashboardPage />
        </StudentLayout>
      )
    case 'student-courses':
      return (
        <StudentLayout currentPath="/student/courses">
          <StudentCoursesPage />
        </StudentLayout>
      )
    case 'student-tryout':
      return (
        <StudentLayout currentPath="/student/tryout">
          <StudentTryoutPage />
        </StudentLayout>
      )
    case 'student-tryout-detail':
      return (
        <StudentLayout currentPath="/student/tryout">
          <StudentTryoutDetailPage tryoutId={route.studentTryoutId ?? ''} />
        </StudentLayout>
      )
    case 'student-coding':
      return (
        <StudentLayout currentPath="/student/coding">
          <StudentCodingPage />
        </StudentLayout>
      )
    case 'student-coding-problem':
      return (
        <StudentLayout currentPath="/student/coding">
          <StudentCodingProblemPage slug={route.codingProblemSlug ?? ''} />
        </StudentLayout>
      )
    case 'student-transactions':
      return (
        <StudentLayout currentPath="/student/transactions">
          <StudentTransactionsPage />
        </StudentLayout>
      )
    case 'student-certificates':
      return (
        <StudentLayout currentPath="/student/certificates">
          <StudentCertificatesPage />
        </StudentLayout>
      )
    case 'student-profile':
      return (
        <StudentLayout currentPath="/student/profile">
          <StudentProfilePage />
        </StudentLayout>
      )
    case 'instructor':
      return (
        <InstructorLayout currentPath="/instructor">
          <InstructorDashboardPage />
        </InstructorLayout>
      )
    case 'instructor-courses':
      return (
        <InstructorLayout currentPath="/instructor/courses">
          <InstructorCoursesPage />
        </InstructorLayout>
      )
    case 'instructor-students':
      return (
        <InstructorLayout currentPath="/instructor/students">
          <InstructorStudentsPage />
        </InstructorLayout>
      )
    case 'instructor-earnings':
      return (
        <InstructorLayout currentPath="/instructor/earnings">
          <InstructorEarningsPage />
        </InstructorLayout>
      )
    case 'instructor-profile':
      return (
        <InstructorLayout currentPath="/instructor/profile">
          <InstructorProfilePage />
        </InstructorLayout>
      )
    case 'instructor-tryouts':
      return (
        <InstructorLayout currentPath="/instructor/tryouts">
          <InstructorTryoutsPage />
        </InstructorLayout>
      )
    case 'instructor-tryout-analysis':
      return (
        <InstructorLayout currentPath="/instructor/tryouts">
          <InstructorTryoutAnalysisPage tryoutId={route.instructorTryoutId ?? ''} />
        </InstructorLayout>
      )
    case 'instructor-attempt-ai':
      return (
        <InstructorLayout currentPath="/instructor/tryouts">
          <InstructorAttemptAIAnalysisPage
            tryoutId={route.instructorTryoutId ?? ''}
            attemptId={route.instructorAttemptId ?? ''}
          />
        </InstructorLayout>
      )
    default:
      return null
  }
}

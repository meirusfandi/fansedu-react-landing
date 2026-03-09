import AuthPage from './AuthPage'
import CatalogPage from './CatalogPage'
import ProgramDetailPage from './ProgramDetailPage'
import CheckoutPage from './CheckoutPage'
import CheckoutSuccessPage from './CheckoutSuccessPage'
import { StudentLayout } from './StudentLayout'
import StudentDashboardPage from './StudentDashboardPage'
import StudentCoursesPage from './StudentCoursesPage'
import StudentTransactionsPage from './StudentTransactionsPage'
import StudentCertificatesPage from './StudentCertificatesPage'
import StudentProfilePage from './StudentProfilePage'
import { InstructorLayout } from './InstructorLayout'
import InstructorDashboardPage from './InstructorDashboardPage'
import InstructorCoursesPage from './InstructorCoursesPage'
import InstructorStudentsPage from './InstructorStudentsPage'
import InstructorEarningsPage from './InstructorEarningsPage'

export interface LmsRoute {
  type: 'auth' | 'catalog' | 'program' | 'checkout' | 'checkout-success' | 'student' | 'student-courses' | 'student-transactions' | 'student-certificates' | 'student-profile' | 'instructor' | 'instructor-courses' | 'instructor-students' | 'instructor-earnings'
  programSlug?: string
  authRedirect?: string
  authTab?: string
  checkoutProgramSlug?: string
  studentPath?: string
  instructorPath?: string
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
  const programMatch = pathOnly.match(/^\/program\/([^/]+)$/)
  if (programMatch) return { type: 'program', programSlug: programMatch[1] }
  if (pathOnly === '/checkout/success') return { type: 'checkout-success' }
  if (pathOnly === '/checkout') {
    const slug = query.get('program') || query.get('course')
    return { type: 'checkout', checkoutProgramSlug: slug || undefined }
  }
  if (pathOnly === '/student') return { type: 'student', studentPath: '/student' }
  if (pathOnly === '/student/courses') return { type: 'student-courses', studentPath: '/student/courses' }
  if (pathOnly === '/student/transactions') return { type: 'student-transactions', studentPath: '/student/transactions' }
  if (pathOnly === '/student/certificates') return { type: 'student-certificates', studentPath: '/student/certificates' }
  if (pathOnly === '/student/profile') return { type: 'student-profile', studentPath: '/student/profile' }
  if (pathOnly === '/instructor') return { type: 'instructor', instructorPath: '/instructor' }
  if (pathOnly === '/instructor/courses') return { type: 'instructor-courses', instructorPath: '/instructor/courses' }
  if (pathOnly === '/instructor/students') return { type: 'instructor-students', instructorPath: '/instructor/students' }
  if (pathOnly === '/instructor/earnings') return { type: 'instructor-earnings', instructorPath: '/instructor/earnings' }
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
    default:
      return null
  }
}

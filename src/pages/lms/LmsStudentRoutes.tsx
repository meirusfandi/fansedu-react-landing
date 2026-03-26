import type { LmsRoute } from './lmsRoutes'
import { StudentLayout } from './StudentLayout'
import StudentDashboardPage from './StudentDashboardPage'
import StudentCoursesPage from './StudentCoursesPage'
import StudentCourseLearnPage from './StudentCourseLearnPage'
import StudentCodingPage from './StudentCodingPage'
import StudentTryoutPage from './StudentTryoutPage'
import StudentTryoutDetailPage from './StudentTryoutDetailPage'
import StudentCodingProblemPage from './StudentCodingProblemPage'
import StudentTransactionsPage from './StudentTransactionsPage'
import StudentCertificatesPage from './StudentCertificatesPage'
import StudentProfilePage from './StudentProfilePage'
import TryoutLeaderboardPage from './TryoutLeaderboardPage'

/** Dashboard & halaman siswa — chunk terpisah, tidak diunduh di landing. */
export default function LmsStudentRoutes({ route }: { route: LmsRoute }) {
  switch (route.type) {
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
    case 'student-course-learn':
      return (
        <StudentLayout currentPath="/student/courses">
          <StudentCourseLearnPage courseSlug={route.courseSlug ?? ''} />
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
    case 'student-leaderboard':
      return (
        <StudentLayout currentPath="/student/tryout">
          <TryoutLeaderboardPage tryoutId={route.studentTryoutId ?? ''} role="student" />
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
    default:
      return null
  }
}

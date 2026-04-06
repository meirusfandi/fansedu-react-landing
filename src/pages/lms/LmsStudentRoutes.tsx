import { lazy, Suspense } from 'react'
import type { LmsRoute } from './lmsRoutes'
import { StudentLayout } from './StudentLayout'
import StudentDashboardPage from './StudentDashboardPage'
import StudentCoursesPage from './StudentCoursesPage'
import StudentPracticePage from './StudentPracticePage'
import StudentCourseLearnPage from './StudentCourseLearnPage'
import StudentCodingPage from './StudentCodingPage'
import StudentTryoutPage from './StudentTryoutPage'
import StudentTryoutHistoryPage from './StudentTryoutHistoryPage'
import StudentTryoutAttemptReviewPage from './StudentTryoutAttemptReviewPage'
import StudentTryoutDetailPage from './StudentTryoutDetailPage'

const StudentTryoutExamPage = lazy(() => import('./StudentTryoutExamPage'))
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
    case 'student-practice':
      return (
        <StudentLayout currentPath="/student/practice">
          <StudentPracticePage />
        </StudentLayout>
      )
    case 'student-course-learn':
      return (
        <StudentLayout currentPath="/student/courses">
          <StudentCourseLearnPage
            courseSlug={route.courseSlug ?? ''}
            initialLessonId={route.journeyLessonId}
          />
        </StudentLayout>
      )
    case 'student-tryout':
      return (
        <StudentLayout currentPath="/student/tryout">
          <StudentTryoutPage />
        </StudentLayout>
      )
    case 'student-tryout-history':
      return (
        <StudentLayout currentPath="/student/tryout">
          <StudentTryoutHistoryPage />
        </StudentLayout>
      )
    case 'student-tryout-attempt-review':
      return (
        <StudentLayout currentPath="/student/tryout">
          <StudentTryoutAttemptReviewPage attemptId={route.studentAttemptId ?? ''} />
        </StudentLayout>
      )
    case 'student-tryout-detail':
      return (
        <StudentLayout currentPath="/student/tryout">
          <StudentTryoutDetailPage tryoutId={route.studentTryoutId ?? ''} />
        </StudentLayout>
      )
    case 'student-tryout-exam':
      return (
        <StudentLayout currentPath="/student/tryout">
          <Suspense
            fallback={
              <div className="py-10 px-1 space-y-4" aria-busy="true" aria-label="Memuat halaman ujian">
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-32 rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
                <p className="text-sm text-gray-500">Memuat lembar ujian…</p>
              </div>
            }
          >
            <StudentTryoutExamPage tryoutId={route.studentTryoutId ?? ''} />
          </Suspense>
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

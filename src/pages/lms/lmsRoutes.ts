/** Tipe rute hash LMS — modul murni tanpa React (aman di-import dari main bundle). */
export interface LmsRoute {
  type:
    | 'auth'
    | 'catalog'
    | 'program'
    | 'checkout'
    | 'checkout-confirm'
    | 'checkout-success'
    | 'student'
    | 'student-courses'
    | 'student-course-learn'
    | 'student-tryout'
    | 'student-tryout-detail'
    | 'student-leaderboard'
    | 'student-coding'
    | 'student-coding-problem'
    | 'student-transactions'
    | 'student-certificates'
    | 'student-profile'
    | 'guru'
    | 'guru-courses'
    | 'guru-students'
    | 'guru-student-detail'
    | 'guru-transactions'
    | 'guru-checkout-confirm'
    | 'guru-earnings'
    | 'guru-profile'
    | 'guru-tryouts'
    | 'guru-leaderboard'
    | 'guru-tryout-analysis'
    | 'guru-tryout-student-detail'
    | 'guru-attempt-ai'
  programSlug?: string
  authRedirect?: string
  authTab?: string
  authProgramSlug?: string
  checkoutProgramSlug?: string
  checkoutConfirmOrderId?: string
  codingProblemSlug?: string
  courseSlug?: string
  studentTryoutId?: string
  studentPath?: string
  guruPath?: string
  guruTryoutId?: string
  guruStudentId?: string
  guruAttemptId?: string
}

export function parseLmsRoute(hashPath: string): LmsRoute | null {
  const path = hashPath.startsWith('/') ? hashPath : `/${hashPath}`
  const pathOnly = path.includes('?') ? path.slice(0, path.indexOf('?')) : path
  const queryString = path.includes('?') ? path.slice(path.indexOf('?') + 1) : ''
  const query = new URLSearchParams(queryString)

  if (pathOnly === '/auth') {
    return {
      type: 'auth',
      authRedirect: query.get('redirect') || '#/',
      authTab: query.get('tab') || 'login',
      authProgramSlug: query.get('slug') || query.get('program') || undefined,
    }
  }
  if (pathOnly === '/catalog') return { type: 'catalog' }
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
  const studentCourseLearnMatch = pathOnly.match(/^\/student\/courses\/([^/]+)$/)
  if (studentCourseLearnMatch) return { type: 'student-course-learn', courseSlug: studentCourseLearnMatch[1], studentPath: '/student/courses' }
  if (pathOnly === '/student/tryout') return { type: 'student-tryout', studentPath: '/student/tryout' }
  const studentTryoutDetailMatch = pathOnly.match(/^\/student\/tryout\/([^/]+)$/)
  if (studentTryoutDetailMatch) return { type: 'student-tryout-detail', studentTryoutId: studentTryoutDetailMatch[1], studentPath: '/student/tryout' }
  const studentLeaderboardMatch = pathOnly.match(/^\/student\/leaderboard\/([^/]+)$/)
  if (studentLeaderboardMatch) return { type: 'student-leaderboard', studentTryoutId: studentLeaderboardMatch[1], studentPath: '/student/tryout' }
  if (pathOnly === '/student/coding') return { type: 'student-coding', studentPath: '/student/coding' }
  const codingProblemMatch = pathOnly.match(/^\/student\/coding\/problem\/([^/]+)$/)
  if (codingProblemMatch) return { type: 'student-coding-problem', codingProblemSlug: codingProblemMatch[1], studentPath: '/student/coding' }
  if (pathOnly === '/student/transactions') return { type: 'student-transactions', studentPath: '/student/transactions' }
  if (pathOnly === '/student/certificates') return { type: 'student-certificates', studentPath: '/student/certificates' }
  if (pathOnly === '/student/profile') return { type: 'student-profile', studentPath: '/student/profile' }

  const gp = pathOnly.replace(/^\/instructor(?=\/|$)/, '/guru')

  if (gp === '/guru') return { type: 'guru', guruPath: '/guru' }
  if (gp === '/guru/courses') return { type: 'guru-courses', guruPath: '/guru/courses' }
  if (gp === '/guru/students') return { type: 'guru-students', guruPath: '/guru/students' }
  const guruStudentDetailMatch = gp.match(/^\/guru\/students\/([^/]+)$/)
  if (guruStudentDetailMatch) {
    return {
      type: 'guru-student-detail',
      guruStudentId: guruStudentDetailMatch[1],
      guruPath: '/guru/students',
    }
  }
  if (gp === '/guru/transactions') return { type: 'guru-transactions', guruPath: '/guru/transactions' }
  if (gp === '/guru/transactions/confirm') {
    return { type: 'guru-checkout-confirm', checkoutConfirmOrderId: query.get('order') || undefined, guruPath: '/guru/transactions' }
  }
  if (gp === '/guru/earnings') return { type: 'guru-earnings', guruPath: '/guru/earnings' }
  if (gp === '/guru/profile') return { type: 'guru-profile', guruPath: '/guru/profile' }
  if (gp === '/guru/tryouts') return { type: 'guru-tryouts', guruPath: '/guru/tryouts' }
  const guruLeaderboardMatch = gp.match(/^\/guru\/leaderboard\/([^/]+)$/)
  if (guruLeaderboardMatch) return { type: 'guru-leaderboard', guruTryoutId: guruLeaderboardMatch[1], guruPath: '/guru/tryouts' }
  const tryoutAnalysisMatch = gp.match(/^\/guru\/tryouts\/([^/]+)\/?$/)
  if (tryoutAnalysisMatch) return { type: 'guru-tryout-analysis', guruTryoutId: tryoutAnalysisMatch[1], guruPath: '/guru/tryouts' }
  const tryoutStudentDetailMatch = gp.match(/^\/guru\/tryouts\/([^/]+)\/students\/([^/]+)\/?$/)
  if (tryoutStudentDetailMatch) {
    return {
      type: 'guru-tryout-student-detail',
      guruTryoutId: tryoutStudentDetailMatch[1],
      guruStudentId: tryoutStudentDetailMatch[2],
      guruPath: '/guru/tryouts',
    }
  }
  const attemptAiMatch = gp.match(/^\/guru\/tryouts\/([^/]+)\/attempts\/([^/]+)\/ai-analysis\/?$/)
  if (attemptAiMatch) {
    return {
      type: 'guru-attempt-ai',
      guruTryoutId: attemptAiMatch[1],
      guruAttemptId: attemptAiMatch[2],
      guruPath: '/guru/tryouts',
    }
  }
  return null
}

export function isStudentLmsRoute(type: LmsRoute['type']): boolean {
  return type.startsWith('student')
}

export function isGuruLmsRoute(type: LmsRoute['type']): boolean {
  return type.startsWith('guru')
}

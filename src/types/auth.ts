export type UserRole = 'student' | 'instructor'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

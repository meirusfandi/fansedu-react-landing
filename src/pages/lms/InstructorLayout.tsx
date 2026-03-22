import { LmsHeader } from '../../components/lms/Header'
import { AuthGuard } from '../../components/lms/AuthGuard'

const MENU = [
  { href: '#/instructor', label: 'Dashboard' },
  { href: '#/instructor/courses', label: 'Kursus Saya' },
  { href: '#/instructor/students', label: 'Siswa' },
  { href: '#/instructor/transactions', label: 'Transaksi' },
  { href: '#/instructor/profile', label: 'Profile' },
]

export function InstructorLayout({ children, currentPath }: { children: React.ReactNode; currentPath: string }) {
  const onRedirect = (path: string) => {
    window.location.hash = path.replace('#', '')
  }
  return (
    <AuthGuard role="instructor" currentPath={currentPath} onRedirect={onRedirect}>
      <div className="min-h-screen flex flex-col">
        <LmsHeader />
        <div className="flex-1 flex">
          <aside className="w-56 border-r bg-white min-h-[calc(100vh-3.5rem)] py-6 px-4">
            <nav className="flex flex-col gap-1">
              {MENU.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium ${
                    currentPath === item.href.replace('#', '') || (item.href !== '#/instructor' && currentPath.startsWith(item.href.replace('#', '')))
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-slate-100 hover:text-primary'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>
          <main className="flex-1 p-8 bg-slate-50">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}

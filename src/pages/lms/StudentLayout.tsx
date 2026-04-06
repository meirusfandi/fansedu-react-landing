import { LmsHeader } from '../../components/lms/Header'
import { AuthGuard } from '../../components/lms/AuthGuard'
import { useLmsSidebarVisible } from '../../hooks/useLmsSidebarVisible'

const MENU = [
  { href: '#/student', label: 'Dashboard' },
  { href: '#/student/practice', label: 'Practice Arena' },
  { href: '#/student/courses', label: 'My Courses' },
  { href: '#/student/tryout', label: 'Tryout' },
  { href: '#/student/transactions', label: 'Transactions' },
  { href: '#/student/profile', label: 'Profile' },
]

export function StudentLayout({ children, currentPath }: { children: React.ReactNode; currentPath: string }) {
  const { sidebarVisible, toggleSidebar } = useLmsSidebarVisible('student')
  const onRedirect = (path: string) => {
    window.location.hash = path.replace('#', '')
  }
  return (
    <AuthGuard role="student" currentPath={currentPath} onRedirect={onRedirect}>
      <div className="min-h-screen flex flex-col">
        <LmsHeader layout="app" appSidebarOpen={sidebarVisible} onAppSidebarToggle={toggleSidebar} />
        <div className="flex flex-1 min-h-0">
          <aside
            className={`shrink-0 border-r border-gray-200 bg-white transition-[width,opacity,padding] duration-200 ease-out min-h-[calc(100vh-3.5rem)] ${
              sidebarVisible ? 'w-56 py-6 px-4 opacity-100' : 'w-0 overflow-hidden border-0 py-0 px-0 opacity-0 pointer-events-none'
            }`}
            inert={!sidebarVisible ? true : undefined}
          >
            <nav className="flex flex-col gap-1">
              {MENU.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium ${
                    currentPath === item.href.replace('#', '') || (item.href !== '#/student' && currentPath.startsWith(item.href.replace('#', '')))
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-slate-100 hover:text-primary'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>
          <main className="min-w-0 flex-1 p-8 bg-slate-50">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}

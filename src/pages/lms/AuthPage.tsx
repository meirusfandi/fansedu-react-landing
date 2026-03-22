import { useState, useEffect } from 'react'
import { LmsHeader } from '../../components/lms/Header'
import { useAuthStore } from '../../store/auth'
import type { UserRole } from '../../types/auth'
import { apiLogin, apiRegister, ApiError } from '../../lib/api'

type Tab = 'login' | 'register'

function isAllowedLmsRole(role: unknown): role is UserRole {
  return role === 'student' || role === 'instructor'
}

export default function AuthPage({ redirect = '#/', tab: tabParam = 'login' }: { redirect?: string; tab?: string }) {
  const [tab, setTab] = useState<Tab>(tabParam === 'register' ? 'register' : 'login')

  useEffect(() => {
    setTab(tabParam === 'register' ? 'register' : 'login')
  }, [tabParam])

  return (
    <div className="min-h-screen flex flex-col">
      <LmsHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex rounded-t-xl border border-b-0 border-gray-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${tab === 'login' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${tab === 'register' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Daftar
            </button>
          </div>
          <div className="rounded-b-xl border border-t-0 border-gray-200 bg-white p-6 shadow-sm">
            {tab === 'login' ? (
              <LoginSection redirect={redirect} onSwitch={() => setTab('register')} />
            ) : (
              <RegisterSection redirect={redirect} onSwitch={() => setTab('login')} />
            )}
          </div>
          <p className="mt-6 text-center text-sm text-gray-500">
            <a href="#/" className="text-primary hover:underline">← Kembali ke beranda</a>
          </p>
        </div>
      </main>
    </div>
  )
}

function LoginSection({ redirect, onSwitch }: { redirect: string; onSwitch: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Email dan kata sandi wajib diisi.')
      return
    }
    setLoading(true)
    try {
      const res = await apiLogin({ email: email.trim(), password })
      if (!isAllowedLmsRole(res.user.role)) {
        setError('Akses ditolak. Login hanya untuk akun siswa atau guru.')
        return
      }
      login(
        { id: res.user.id, name: res.user.name, email: res.user.email, role: res.user.role },
        res.token,
        rememberMe
      )
      window.location.hash = redirect.startsWith('#') ? redirect : `#${redirect}`
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('email/password salah, silahkan coba lagi')
      } else {
        setError(err instanceof ApiError ? err.message : 'Gagal masuk. Cek email dan kata sandi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Masuk</h2>
      <p className="text-gray-600 text-sm mb-6">Gunakan akun Anda untuk mengakses dashboard.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="nama@email.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">Kata sandi</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary/30"
          />
          Ingat saya
        </label>
        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50">
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        Belum punya akun?{' '}
        <button type="button" onClick={onSwitch} className="text-primary font-medium hover:underline">
          Daftar
        </button>
      </p>
    </>
  )
}

function RegisterSection({ redirect, onSwitch }: { redirect: string; onSwitch: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Nama, email, dan kata sandi wajib diisi.')
      return
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }
    setLoading(true)
    try {
      const res = await apiRegister({
        name: name.trim(),
        email: email.trim(),
        password,
        role: role as 'student' | 'instructor',
      })
      if (!isAllowedLmsRole(res.user.role)) {
        setError('Akses ditolak. Registrasi di aplikasi ini hanya untuk siswa atau guru.')
        return
      }
      // Flow tanpa verifikasi email: langsung login setelah register berhasil.
      login(
        { id: res.user.id, name: res.user.name, email: res.user.email, role: res.user.role },
        res.token
      )
      setSuccessMessage('Pendaftaran berhasil. Anda langsung masuk ke akun Anda.')
      window.location.hash = redirect.startsWith('#') ? redirect : `#${redirect}`
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal daftar. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Daftar</h2>
      <p className="text-gray-600 text-sm mb-6">
        Buat akun untuk mengakses kursus dan dashboard. Setelah daftar, akun Anda langsung aktif dan bisa digunakan.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
        {successMessage && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{successMessage}</div>}
        <div>
          <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-1">Nama lengkap</label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Nama Anda"
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="nama@email.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">Kata sandi</label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Min. 6 karakter"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Daftar sebagai</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} className="text-primary" />
              <span>Siswa</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="role" value="instructor" checked={role === 'instructor'} onChange={() => setRole('instructor')} className="text-primary" />
              <span>Guru</span>
            </label>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50">
          {loading ? 'Memproses...' : 'Daftar'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        Sudah punya akun?{' '}
        <button type="button" onClick={onSwitch} className="text-primary font-medium hover:underline">
          Masuk
        </button>
      </p>
    </>
  )
}

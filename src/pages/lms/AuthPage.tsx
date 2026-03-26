import { useState, useEffect } from 'react'
import { LmsHeader } from '../../components/lms/Header'
import { useAuthStore } from '../../store/auth'
import { authUserFromApiResponse, type UserRole } from '../../types/auth'
import { apiLogin, apiRegister, ApiError } from '../../lib/api'
import { resolvePostAuthHash } from '../../lib/post-auth-redirect'
import { MAX_SUBMIT_ATTEMPTS, useSubmitAttemptLimit } from '../../hooks/useSubmitAttemptLimit'

type Tab = 'login' | 'register'

function PasswordToggleButton({
  visible,
  onToggle,
}: {
  visible: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-primary"
      aria-label={visible ? 'Sembunyikan password' : 'Lihat password'}
      title={visible ? 'Sembunyikan password' : 'Lihat password'}
    >
      {visible ? (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 5.09A9.77 9.77 0 0112 5c5 0 9 4 10 7-0.45 1.35-1.27 2.7-2.38 3.9M6.1 6.1C4.27 7.4 2.88 9.16 2 12c1 3 5 7 10 7 1.76 0 3.4-.5 4.83-1.35" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  )
}

export default function AuthPage({
  redirect = '',
  tab: tabParam = 'login',
}: {
  redirect?: string
  tab?: string
}) {
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
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const attempt = useSubmitAttemptLimit()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (attempt.blocked) return
    if (!email.trim() || !password.trim()) {
      setError('Email dan kata sandi wajib diisi.')
      return
    }
    setLoading(true)
    try {
      const res = await apiLogin({ email: email.trim(), password })
      const authUser = authUserFromApiResponse(res.user, res.token)
      attempt.onSuccess()
      login(authUser, res.token, rememberMe)
      window.location.hash = resolvePostAuthHash(redirect, authUser.role)
    } catch (err) {
      attempt.onFailure()
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
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <PasswordToggleButton visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </div>
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
        <button
          type="submit"
          disabled={loading || attempt.blocked}
          className="w-full py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
        {attempt.blocked && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="mb-2">
              Sudah {MAX_SUBMIT_ATTEMPTS} kali gagal. Kirim ulang dinonaktifkan agar tidak membebani server.
            </p>
            <button
              type="button"
              onClick={() => {
                attempt.resetLimit()
                setError('')
              }}
              className="w-full py-2.5 rounded-lg border border-amber-300 bg-white font-medium text-amber-900 hover:bg-amber-100"
            >
              Coba lagi
            </button>
          </div>
        )}
        {attempt.failCount > 0 && !attempt.blocked && (
          <p className="text-xs text-gray-500 text-center">
            Percobaan gagal {attempt.failCount}/{MAX_SUBMIT_ATTEMPTS}
          </p>
        )}
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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState<UserRole>('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const login = useAuthStore((s) => s.login)
  const attempt = useSubmitAttemptLimit()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    if (attempt.blocked) return
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Nama, email, kata sandi, dan konfirmasi kata sandi wajib diisi.')
      return
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak sama.')
      return
    }
    setLoading(true)
    try {
      const res = await apiRegister({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      })
      const authUser = authUserFromApiResponse(res.user, res.token)
      attempt.onSuccess()
      login(authUser, res.token)
      setSuccessMessage('Pendaftaran berhasil. Anda langsung masuk ke akun Anda.')
      window.location.hash = resolvePostAuthHash(redirect, authUser.role)
    } catch (err) {
      attempt.onFailure()
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
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Min. 6 karakter"
              autoComplete="new-password"
            />
            <PasswordToggleButton visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </div>
        </div>
        <div>
          <label htmlFor="reg-password-confirm" className="block text-sm font-medium text-gray-700 mb-1">
            Konfirmasi kata sandi
          </label>
          <div className="relative">
            <input
              id="reg-password-confirm"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Ulangi kata sandi"
              autoComplete="new-password"
            />
            <PasswordToggleButton
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((v) => !v)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Daftar sebagai</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} className="text-primary" />
              <span>Siswa</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="role" value="guru" checked={role === 'guru'} onChange={() => setRole('guru')} className="text-primary" />
              <span>Guru</span>
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || attempt.blocked}
          className="w-full py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? 'Memproses...' : 'Daftar'}
        </button>
        {attempt.blocked && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="mb-2">
              Sudah {MAX_SUBMIT_ATTEMPTS} kali gagal. Kirim ulang dinonaktifkan agar tidak membebani server.
            </p>
            <button
              type="button"
              onClick={() => {
                attempt.resetLimit()
                setError('')
              }}
              className="w-full py-2.5 rounded-lg border border-amber-300 bg-white font-medium text-amber-900 hover:bg-amber-100"
            >
              Coba lagi
            </button>
          </div>
        )}
        {attempt.failCount > 0 && !attempt.blocked && (
          <p className="text-xs text-gray-500 text-center">
            Percobaan gagal {attempt.failCount}/{MAX_SUBMIT_ATTEMPTS}
          </p>
        )}
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

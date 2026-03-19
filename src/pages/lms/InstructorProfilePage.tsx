import { useState, useEffect } from 'react'
import { getInstructorProfile, updateInstructorProfile } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { ApiError } from '../../lib/api'

export default function InstructorProfilePage() {
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 3000)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    getInstructorProfile()
      .then((res) => {
        setName(res.name ?? '')
        setEmail(res.email ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      await updateInstructorProfile({ name: name.trim(), email: email.trim() })
      if (user) setUser({ ...user, name: name.trim(), email: email.trim() })
      setMessage('Profil berhasil disimpan.')
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-8 text-gray-500">Memuat...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
      <div className="max-w-md rounded-2xl border bg-white p-6 space-y-4">
        {message && (
          <div className={`p-3 rounded-lg text-sm flex items-start justify-between gap-3 ${message.includes('berhasil') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="text-xs font-semibold opacity-80 hover:opacity-100"
              aria-label="Tutup notifikasi"
            >
              Tutup
            </button>
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
          </div>
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-hover disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      </div>
    </div>
  )
}

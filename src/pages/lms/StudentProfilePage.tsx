import { useState, useEffect } from 'react'
import { getStudentProfile, updateStudentPassword, updateStudentProfile } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { ApiError } from '../../lib/api'

export default function StudentProfilePage() {
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [school, setSchool] = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [gender, setGender] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [bio, setBio] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [passwordRequiredBanner, setPasswordRequiredBanner] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 3000)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    if (!passwordMessage) return
    const timer = window.setTimeout(() => setPasswordMessage(null), 3000)
    return () => window.clearTimeout(timer)
  }, [passwordMessage])

  useEffect(() => {
    const currentHash = window.location.hash || ''
    if (!currentHash.includes('password_setup_required=1')) return
    setPasswordRequiredBanner('Akses dibatasi sementara. Silakan ubah password dulu untuk melanjutkan.')
  }, [])

  useEffect(() => {
    getStudentProfile()
      .then((res) => {
        setName(String(res.name ?? ''))
        setEmail(String(res.email ?? ''))
        setPhone(String((res.phone ?? res.phoneNumber ?? '') as string))
        setWhatsapp(String((res.whatsapp ?? res.whatsappNumber ?? '') as string))
        setSchool(String((res.school ?? res.schoolName ?? '') as string))
        setClassLevel(String((res.classLevel ?? res.class ?? res.grade ?? '') as string))
        setCity(String((res.city ?? '') as string))
        setProvince(String((res.province ?? '') as string))
        setGender(String((res.gender ?? '') as string))
        setBirthDate(String((res.birthDate ?? res.birth_date ?? '') as string))
        setBio(String((res.bio ?? '') as string))
        setParentName(String((res.parentName ?? res.parent_name ?? '') as string))
        setParentPhone(String((res.parentPhone ?? res.parent_phone ?? '') as string))
        setInstagram(String((res.instagram ?? '') as string))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      await updateStudentProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        school: school.trim(),
        classLevel: classLevel.trim(),
        city: city.trim(),
        province: province.trim(),
        gender: gender.trim(),
        birthDate: birthDate.trim(),
        bio: bio.trim(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        instagram: instagram.trim(),
      })
      if (user) setUser({ ...user, name: name.trim(), email: email.trim() })
      setMessage('Profil berhasil disimpan.')
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (!currentPassword.trim()) {
      setPasswordMessage('Password saat ini wajib diisi.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordMessage('Password baru minimal 6 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Konfirmasi password tidak sama.')
      return
    }

    setSavingPassword(true)
    try {
      await updateStudentPassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage('Password berhasil diperbarui.')
    } catch (err) {
      setPasswordMessage(err instanceof ApiError ? err.message : 'Gagal memperbarui password.')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) return <div className="py-8 text-gray-500">Memuat...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
      <div className="rounded-2xl border bg-white p-6 space-y-4 mb-6">
        {passwordRequiredBanner && (
          <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm flex items-start justify-between gap-3">
            <span>{passwordRequiredBanner}</span>
            <button
              type="button"
              onClick={() => setPasswordRequiredBanner(null)}
              className="text-xs font-semibold opacity-80 hover:opacity-100"
            >
              Tutup
            </button>
          </div>
        )}
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
          <h2 className="text-lg font-semibold text-gray-900">Data Profil</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. HP</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sekolah</label>
              <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
              <input type="text" value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
              <input type="text" value={province} onChange={(e) => setProvince(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 text-sm bg-white"
              >
                <option value="">Pilih jenis kelamin</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Orang Tua</label>
              <input type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. HP Orang Tua</label>
              <input type="text" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
            <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
          </div>
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-hover disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border bg-white p-6 space-y-4 max-w-xl">
        <h2 className="text-lg font-semibold text-gray-900">Ubah Password</h2>
        {passwordMessage && (
          <div className={`p-3 rounded-lg text-sm flex items-start justify-between gap-3 ${passwordMessage.includes('berhasil') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <span>{passwordMessage}</span>
            <button
              type="button"
              onClick={() => setPasswordMessage(null)}
              className="text-xs font-semibold opacity-80 hover:opacity-100"
              aria-label="Tutup notifikasi"
            >
              Tutup
            </button>
          </div>
        )}
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Saat Ini</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 pr-11 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-primary"
                aria-label={showCurrentPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showCurrentPassword ? (
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
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 pr-11 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-primary"
                aria-label={showNewPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showNewPassword ? (
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
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 pr-11 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-primary"
                aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showConfirmPassword ? (
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
            </div>
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="w-full py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-hover disabled:opacity-50"
          >
            {savingPassword ? 'Menyimpan Password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

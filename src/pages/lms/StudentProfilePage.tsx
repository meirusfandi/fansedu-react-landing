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
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
            />
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

import { useState, useEffect } from 'react'
import {
  createSchool,
  getInstructorProfile,
  getSchools,
  updateInstructorPassword,
  updateInstructorProfile,
} from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { ApiError } from '../../lib/api'

interface ProvinceItem {
  id: string
  name: string
}

interface CityItem {
  id: string
  name: string
}

const OPEN_PROVINCES_API = 'https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json'
const OPEN_CITIES_API_BY_PROVINCE = (provinceId: string) =>
  `https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${encodeURIComponent(provinceId)}.json`

export default function InstructorProfilePage() {
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [schoolNameFallback, setSchoolNameFallback] = useState('')
  const [schoolOptions, setSchoolOptions] = useState<Array<{ id: string; name: string }>>([])
  const [showAddSchool, setShowAddSchool] = useState(false)
  const [creatingSchool, setCreatingSchool] = useState(false)
  const [schoolMessage, setSchoolMessage] = useState<string | null>(null)
  const [newSchoolName, setNewSchoolName] = useState('')
  const [newSchoolDescription, setNewSchoolDescription] = useState('')
  const [newSchoolAddress, setNewSchoolAddress] = useState('')
  const [newSchoolLogoUrl, setNewSchoolLogoUrl] = useState('')
  const [city, setCity] = useState('')
  const [cityOptions, setCityOptions] = useState<CityItem[]>([])
  const [loadingSchoolOptions, setLoadingSchoolOptions] = useState(false)
  const [provinces, setProvinces] = useState<ProvinceItem[]>([])
  const [provinceId, setProvinceId] = useState('')
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [province, setProvince] = useState('')
  const [gender, setGender] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [passwordRequiredBanner, setPasswordRequiredBanner] = useState<string | null>(null)
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
    const currentHash = window.location.hash || ''
    if (!currentHash.includes('password_setup_required=1')) return
    setPasswordRequiredBanner('Akses dibatasi sementara. Silakan ubah password dulu untuk melanjutkan.')
  }, [])

  useEffect(() => {
    getInstructorProfile()
      .then((res) => {
        setName(String(res.name ?? ''))
        setEmail(String(res.email ?? ''))
        setPhone(String((res.phone ?? res.phoneNumber ?? '') as string))
        setWhatsapp(String((res.whatsapp ?? res.whatsappNumber ?? '') as string))
        setSchoolId(String((res.schoolId ?? res.school_id ?? '') as string))
        setSchoolNameFallback(String((res.school ?? res.schoolName ?? '') as string))
        setCity(String((res.city ?? '') as string))
        setProvince(String((res.province ?? '') as string))
        setGender(String((res.gender ?? '') as string))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setLoadingSchoolOptions(true)
    getSchools()
      .then((res) => {
        setSchoolOptions((res.data || []).map((item) => ({ id: item.id, name: item.name })))
      })
      .catch(() => {
        setSchoolOptions([])
      })
      .finally(() => setLoadingSchoolOptions(false))
  }, [])

  useEffect(() => {
    if (!schoolId && schoolNameFallback.trim() && schoolOptions.length > 0) {
      const matched = schoolOptions.find(
        (item) => item.name.trim().toLowerCase() === schoolNameFallback.trim().toLowerCase()
      )
      if (matched) setSchoolId(matched.id)
    }
  }, [schoolId, schoolNameFallback, schoolOptions])

  useEffect(() => {
    let cancelled = false
    setLoadingProvinces(true)
    fetch(OPEN_PROVINCES_API)
      .then((res) => res.json())
      .then((rows: unknown) => {
        if (cancelled) return
        const list = Array.isArray(rows)
          ? rows.map((item) => item as Record<string, unknown>)
          : []
        const parsed = list.map((item) => ({
          id: String(item.id ?? ''),
          name: String(item.name ?? ''),
        })).filter((item) => item.id && item.name)
        setProvinces(parsed)
      })
      .catch(() => {
        if (cancelled) return
        setProvinces([])
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!provinceId) {
      setCityOptions([])
      return
    }
    let cancelled = false
    setLoadingCities(true)
    fetch(OPEN_CITIES_API_BY_PROVINCE(provinceId))
      .then((res) => res.json())
      .then((rows: unknown) => {
        if (cancelled) return
        const list = Array.isArray(rows)
          ? rows.map((item) => item as Record<string, unknown>)
          : []
        const parsed = list.map((item) => ({
          id: String(item.id ?? ''),
          name: String(item.name ?? ''),
        })).filter((item) => item.id && item.name)
        setCityOptions(parsed)
      })
      .catch(() => {
        if (cancelled) return
        setCityOptions([])
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false)
      })
    return () => {
      cancelled = true
    }
  }, [provinceId])

  useEffect(() => {
    if (!province || provinces.length === 0 || provinceId) return
    const matched = provinces.find((item) => item.name.toLowerCase() === province.toLowerCase())
    if (matched) setProvinceId(matched.id)
  }, [province, provinces, provinceId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      const selectedSchool = schoolOptions.find((item) => item.id === schoolId)
      await updateInstructorProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        schoolId: schoolId || undefined,
        school_id: schoolId || undefined,
        school: selectedSchool?.name ?? undefined,
        city: city.trim(),
        province: province.trim(),
        gender: gender.trim(),
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
      await updateInstructorPassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage('Password berhasil diperbarui.')
      setPasswordRequiredBanner(null)
    } catch (err) {
      setPasswordMessage(err instanceof ApiError ? err.message : 'Gagal memperbarui password.')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    setSchoolMessage(null)
    if (!newSchoolName.trim()) {
      setSchoolMessage('Nama sekolah wajib diisi.')
      return
    }
    setCreatingSchool(true)
    try {
      const created = await createSchool({
        name: newSchoolName.trim(),
        description: newSchoolDescription.trim() || undefined,
        address: newSchoolAddress.trim() || undefined,
        logoUrl: newSchoolLogoUrl.trim() || undefined,
      })
      const option = { id: created.id || `school-${Date.now()}`, name: created.name }
      setSchoolOptions((prev) => {
        const exists = prev.some((item) => item.name.toLowerCase() === option.name.toLowerCase())
        if (exists) return prev
        return [option, ...prev]
      })
      setSchoolId(option.id)
      setSchoolNameFallback(option.name)
      setShowAddSchool(false)
      setSchoolMessage('Sekolah berhasil ditambahkan.')
      setNewSchoolName('')
      setNewSchoolDescription('')
      setNewSchoolAddress('')
      setNewSchoolLogoUrl('')
    } catch (err) {
      setSchoolMessage(err instanceof ApiError ? err.message : 'Gagal menambahkan sekolah.')
    } finally {
      setCreatingSchool(false)
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
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 pr-10 text-sm bg-white"
                disabled={loadingSchoolOptions}
              >
                <option value="">Pilih sekolah</option>
                {schoolOptions.map((schoolItem) => (
                  <option key={schoolItem.id} value={schoolItem.id}>{schoolItem.name}</option>
                ))}
              </select>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs text-primary font-medium hover:underline"
                  onClick={() => setShowAddSchool((prev) => !prev)}
                >
                  {showAddSchool ? 'Tutup form sekolah baru' : 'Sekolah tidak ada? Tambah sekolah'}
                </button>
              </div>
              {schoolMessage && (
                <p className={`mt-1 text-xs ${schoolMessage.includes('berhasil') ? 'text-green-700' : 'text-red-700'}`}>
                  {schoolMessage}
                </p>
              )}
              {schoolOptions.length === 0 && !loadingSchoolOptions && (
                <p className="mt-1 text-xs text-gray-500">
                  Data sekolah belum tersedia dari API schools.
                </p>
              )}
              {showAddSchool && (
                <form onSubmit={handleCreateSchool} className="mt-3 rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50">
                  <input
                    type="text"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    placeholder="Nama sekolah"
                    className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                  />
                  <input
                    type="text"
                    value={newSchoolAddress}
                    onChange={(e) => setNewSchoolAddress(e.target.value)}
                    placeholder="Alamat (opsional)"
                    className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                  />
                  <textarea
                    value={newSchoolDescription}
                    onChange={(e) => setNewSchoolDescription(e.target.value)}
                    placeholder="Deskripsi (opsional)"
                    className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                    rows={2}
                  />
                  <input
                    type="url"
                    value={newSchoolLogoUrl}
                    onChange={(e) => setNewSchoolLogoUrl(e.target.value)}
                    placeholder="Logo URL (opsional)"
                    className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                  />
                  <button
                    type="submit"
                    disabled={creatingSchool}
                    className="w-full rounded-md bg-primary text-white text-sm font-medium py-2 disabled:opacity-50"
                  >
                    {creatingSchool ? 'Menyimpan...' : 'Simpan sekolah'}
                  </button>
                </form>
              )}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
              <select
                value={provinceId}
                onChange={(e) => {
                  const selectedId = e.target.value
                  setProvinceId(selectedId)
                  const selectedProvince = provinces.find((item) => item.id === selectedId)
                  setProvince(selectedProvince?.name ?? '')
                  setCity('')
                }}
                className="w-full rounded-lg border px-4 py-2.5 pr-10 text-sm bg-white"
                disabled={loadingProvinces}
              >
                <option value="">Pilih provinsi</option>
                {provinces.map((provinceItem) => (
                  <option key={provinceItem.id} value={provinceItem.id}>{provinceItem.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kabupaten/Kota</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 pr-10 text-sm bg-white"
                disabled={!provinceId || loadingCities}
              >
                <option value="">Pilih kabupaten/kota</option>
                {cityOptions.map((cityItem) => (
                  <option key={cityItem.id} value={cityItem.name}>{cityItem.name}</option>
                ))}
              </select>
              {cityOptions.length === 0 && !loadingCities && (
                <p className="mt-1 text-xs text-gray-500">
                  {provinceId ? 'Data kabupaten/kota belum tersedia dari API global.' : 'Pilih provinsi dulu untuk melihat kabupaten/kota.'}
                </p>
              )}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 pr-10 text-sm bg-white"
              >
                <option value="">Pilih jenis kelamin</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
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

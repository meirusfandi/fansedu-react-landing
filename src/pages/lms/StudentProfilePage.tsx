import { useState, useEffect } from 'react'
import {
  ApiError,
  authSetPassword,
  createSchool,
  getRegisterMasterData,
  type RegisterLevelOption,
  getSchools,
  getStudentProfile,
  updateStudentPassword,
  updateStudentProfile,
} from '../../lib/api'
import { applyPasswordSetupRedirect, hashRequiresPasswordSetup } from '../../lib/post-auth-redirect'
import { validateLmsPasswordChange } from '../../utils/lmsPasswordForm'
import {
  fetchProvinces,
  fetchRegenciesByProvince,
  type GeoCityItem,
  type GeoProvinceItem,
} from '../../lib/geo-wilayah'
import {
  getRegisterLevelById,
  validateRegisterSelection,
} from '../../utils/registerMasterValidation'
import { useAuthStore } from '../../store/auth'

export default function StudentProfilePage() {
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
  const [classLevel, setClassLevel] = useState('')
  const [levelId, setLevelId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [registerLevels, setRegisterLevels] = useState<RegisterLevelOption[]>([])
  const [loadingRegisterMaster, setLoadingRegisterMaster] = useState(false)
  const [city, setCity] = useState('')
  const [cityOptions, setCityOptions] = useState<GeoCityItem[]>([])
  const [loadingSchoolOptions, setLoadingSchoolOptions] = useState(false)
  const [provinces, setProvinces] = useState<GeoProvinceItem[]>([])
  const [provinceId, setProvinceId] = useState('')
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [province, setProvince] = useState('')
  const [gender, setGender] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
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
  const [firstPasswordMode, setFirstPasswordMode] = useState(false)

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
    const fromHash = hashRequiresPasswordSetup(window.location.hash)
    if (fromHash) {
      setPasswordRequiredBanner(
        'Akses dibatasi sementara. Silakan ubah password dulu untuk melanjutkan.',
      )
    }
    getStudentProfile()
      .then((res) => {
        setFirstPasswordMode(fromHash || res.mustSetPassword === true)
        setName(String(res.name ?? ''))
        setEmail(String(res.email ?? ''))
        setPhone(String((res.phone ?? res.phoneNumber ?? '') as string))
        setWhatsapp(String((res.whatsapp ?? res.whatsappNumber ?? '') as string))
        setSchoolId(String(res.schoolId ?? ''))
        setSchoolNameFallback(String(res.schoolName ?? res.school ?? ''))
        setLevelId(String((res.levelId ?? '') as string))
        setSubjectId(String((res.subjectId ?? '') as string))
        setClassLevel(String((res.classLevel ?? res.class ?? res.grade ?? '') as string))
        setCity(String((res.city ?? '') as string))
        setProvince(String((res.province ?? '') as string))
        setGender(String((res.gender ?? '') as string))
        setBirthDate(String(res.birthDate ?? ''))
        setParentName(String(res.parentName ?? ''))
        setParentPhone(String(res.parentPhone ?? ''))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoadingRegisterMaster(true)
    getRegisterMasterData()
      .then((res) => {
        if (cancelled) return
        setRegisterLevels(res.levels ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setRegisterLevels([])
      })
      .finally(() => {
        if (!cancelled) setLoadingRegisterMaster(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedRegisterLevel = getRegisterLevelById(registerLevels, levelId)

  useEffect(() => {
    if (!selectedRegisterLevel) return
    if (subjectId && !selectedRegisterLevel.subjects.some((s) => s.id === subjectId)) {
      setSubjectId('')
    }
    if (classLevel && !selectedRegisterLevel.classes.some((c) => c.value === classLevel)) {
      setClassLevel('')
    }
  }, [levelId, selectedRegisterLevel, subjectId, classLevel])

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
        (item) => item.name.trim().toLowerCase() === schoolNameFallback.trim().toLowerCase(),
      )
      if (matched) setSchoolId(matched.id)
    }
  }, [schoolId, schoolNameFallback, schoolOptions])

  useEffect(() => {
    let cancelled = false
    setLoadingProvinces(true)
    fetchProvinces()
      .then((parsed) => {
        if (cancelled) return
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
    fetchRegenciesByProvince(provinceId)
      .then((parsed) => {
        if (cancelled) return
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

  const handleCreateSchool = async () => {
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

      let list: Awaited<ReturnType<typeof getSchools>> = { data: [] }
      try {
        list = await getSchools()
      } catch {
        /* daftar dari GET /schools opsional untuk sinkron */
      }
      const rows = (list.data ?? []).map((item) => ({ id: item.id, name: item.name }))
      const nameNorm = created.name.trim().toLowerCase()
      let nextOptions = rows
      if (created.id.trim() && !rows.some((item) => item.id === created.id)) {
        nextOptions = [{ id: created.id, name: created.name }, ...rows]
      }
      setSchoolOptions(nextOptions)

      const selected =
        (created.id.trim() && nextOptions.find((item) => item.id === created.id)) ||
        nextOptions.find((item) => item.name.trim().toLowerCase() === nameNorm)

      if (!selected) {
        setSchoolMessage(
          'Sekolah mungkin sudah tersimpan di server, tetapi daftar lokal belum terbarui. Muat ulang halaman lalu pilih sekolah dari daftar.',
        )
        return
      }

      setSchoolId(selected.id)
      setSchoolNameFallback(selected.name)
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const masterSelectionError = validateRegisterSelection({
      levels: registerLevels,
      levelId,
      subjectId,
      classLevel,
      requireClass: true,
    })
    if (masterSelectionError) {
      setMessage(masterSelectionError)
      return
    }
    setSaving(true)
    try {
      const selectedSchool = schoolOptions.find((item) => item.id === schoolId)
      await updateStudentProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        schoolId: schoolId || undefined,
        school: (selectedSchool?.name ?? schoolNameFallback.trim()) || undefined,
        levelId: levelId || undefined,
        subjectId: subjectId || undefined,
        classLevel: classLevel.trim(),
        city: city.trim(),
        province: province.trim(),
        gender: gender.trim(),
        birthDate: birthDate.trim(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
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

    const validationError = validateLmsPasswordChange({
      newPassword,
      confirmPassword,
      firstPasswordMode,
      currentPassword,
    })
    if (validationError) {
      setPasswordMessage(validationError)
      return
    }

    setSavingPassword(true)
    try {
      if (firstPasswordMode) {
        await authSetPassword(newPassword.trim())
        setFirstPasswordMode(false)
        setPasswordRequiredBanner(null)
        setNewPassword('')
        setConfirmPassword('')
        setPasswordMessage('Password berhasil diatur.')
        applyPasswordSetupRedirect('#/student')
      } else {
        await updateStudentPassword({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim(),
        })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setPasswordRequiredBanner(null)
        setPasswordMessage('Password berhasil diperbarui.')
      }
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
          {registerLevels.length === 0 && !loadingRegisterMaster ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Master data jenjang/bidang/kelas belum tersedia dari server. Simpan profil tetap bisa dilakukan.
            </p>
          ) : null}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenjang</label>
              <select
                value={levelId}
                onChange={(e) => setLevelId(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 pr-10 text-sm bg-white"
                disabled={loadingRegisterMaster}
              >
                <option value="">Pilih jenjang</option>
                {registerLevels.map((lv) => (
                  <option key={lv.id} value={lv.id}>
                    {lv.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bidang Pelajaran</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 pr-10 text-sm bg-white"
                disabled={loadingRegisterMaster || !selectedRegisterLevel}
              >
                <option value="">Pilih bidang</option>
                {selectedRegisterLevel?.subjects.map((sbj) => (
                  <option key={sbj.id} value={sbj.id}>
                    {sbj.name}
                  </option>
                ))}
              </select>
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
                  <option key={schoolItem.id} value={schoolItem.id}>
                    {schoolItem.name}
                  </option>
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
                <p className="mt-1 text-xs text-gray-500">Data sekolah belum tersedia dari API schools.</p>
              )}
              {showAddSchool && (
                <div
                  className="mt-3 rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50"
                  role="group"
                  aria-label="Form tambah sekolah"
                >
                  <input
                    type="text"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault()
                    }}
                    placeholder="Nama sekolah"
                    className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                  />
                  <input
                    type="text"
                    value={newSchoolAddress}
                    onChange={(e) => setNewSchoolAddress(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault()
                    }}
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault()
                    }}
                    placeholder="Logo URL (opsional)"
                    className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                  />
                  <button
                    type="button"
                    disabled={creatingSchool}
                    onClick={() => void handleCreateSchool()}
                    className="w-full rounded-md bg-primary text-white text-sm font-medium py-2 disabled:opacity-50"
                  >
                    {creatingSchool ? 'Menyimpan...' : 'Simpan sekolah'}
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
              {selectedRegisterLevel ? (
                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full rounded-lg border px-4 py-2.5 pr-10 text-sm bg-white"
                  disabled={loadingRegisterMaster}
                >
                  <option value="">Pilih kelas</option>
                  {selectedRegisterLevel.classes.map((cls) => (
                    <option key={cls.value} value={cls.value}>
                      {cls.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
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
                  <option key={provinceItem.id} value={provinceItem.id}>
                    {provinceItem.name}
                  </option>
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
                  <option key={cityItem.id} value={cityItem.name}>
                    {cityItem.name}
                  </option>
                ))}
              </select>
              {cityOptions.length === 0 && !loadingCities && (
                <p className="mt-1 text-xs text-gray-500">
                  {provinceId
                    ? 'Data kabupaten/kota belum tersedia dari API global.'
                    : 'Pilih provinsi dulu untuk melihat kabupaten/kota.'}
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
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-hover disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border bg-white p-6 space-y-4 max-w-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          {firstPasswordMode ? 'Atur password' : 'Ubah Password'}
        </h2>
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
          {!firstPasswordMode ? (
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
          ) : null}
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
            {savingPassword ? 'Menyimpan Password...' : firstPasswordMode ? 'Simpan password' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

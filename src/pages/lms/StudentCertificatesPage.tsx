import { useState, useEffect } from 'react'
import { getCertificates } from '../../lib/api'
import { ApiError } from '../../lib/api'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function StudentCertificatesPage() {
  const [data, setData] = useState<{ id: string; programTitle: string; issuedAt: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCertificates()
      .then((res) => setData(res.data || []))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat data.')
        setData([])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-8 text-gray-500">Memuat...</div>
  if (error) return <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">{error}</div>

  if (data.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Certificates</h1>
        <div className="rounded-2xl border bg-white p-12 text-center text-gray-500">
          Belum ada sertifikat. Selesaikan kursus untuk mendapatkan sertifikat.
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Certificates</h1>
      <div className="grid sm:grid-cols-2 gap-6">
        {data.map((c) => (
          <div key={c.id} className="rounded-2xl border bg-white p-6">
            <h2 className="font-semibold text-gray-900 mb-1">{c.programTitle}</h2>
            <p className="text-sm text-gray-500">Diterbitkan: {formatDate(c.issuedAt)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

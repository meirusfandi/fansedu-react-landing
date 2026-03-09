import { useState, useEffect } from 'react'
import { LmsHeader } from '../../components/lms/Header'
import { getProgramBySlug } from '../../lib/api'
import type { Course } from '../../types/course'

export default function ProgramDetailPage({ slug }: { slug: string }) {
  const [program, setProgram] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getProgramBySlug(slug)
      .then((res) => {
        if (res) setProgram(res as unknown as Course)
        else setProgram(null)
      })
      .catch(() => {
        setError('Gagal memuat program.')
        setProgram(null)
      })
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <LmsHeader />
        <main className="flex-1 flex items-center justify-center py-20">
          <p className="text-gray-500">Memuat...</p>
        </main>
      </div>
    )
  }

  if (error || !program) {
    return (
      <div className="min-h-screen flex flex-col">
        <LmsHeader />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">
            {error || 'Program tidak ditemukan.'} <a href="#/catalog" className="text-primary">Katalog</a>
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <LmsHeader />
      <main className="flex-1 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="text-sm text-gray-500 mb-6">
            <a href="#/" className="hover:text-primary">Beranda</a>
            <span className="mx-2">/</span>
            <a href="#/catalog" className="hover:text-primary">Katalog Program</a>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{program.title}</span>
          </nav>
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <div className="aspect-video rounded-2xl bg-slate-100 flex items-center justify-center text-4xl font-bold text-slate-300 mb-6">
                {program.thumbnail ? <img src={program.thumbnail} alt="" className="w-full h-full object-cover rounded-2xl" /> : program.title.charAt(0)}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{program.title}</h1>
              <p className="text-lg text-gray-600 mb-4">{program.shortDescription}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
                <span>Oleh <strong className="text-gray-700">{program.instructor.name}</strong></span>
                <span>•</span>
                <span>{program.duration}</span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-gray-700">{program.category}</span>
                {program.rating != null && (
                  <>
                    <span>•</span>
                    <span className="text-amber-600">★ {program.rating}</span>
                    {program.reviewCount != null && <span>({program.reviewCount} ulasan)</span>}
                  </>
                )}
              </div>

              {program.modules && program.modules.length > 0 && (
                <section className="border rounded-2xl p-6 mb-8">
                  <h2 className="font-semibold text-gray-900 mb-4">Materi Program</h2>
                  <ul className="space-y-3">
                    {program.modules.map((mod) => (
                      <li key={mod.id}>
                        <p className="font-medium text-gray-800">{mod.title}</p>
                        {mod.lessons && mod.lessons.length > 0 && (
                          <ul className="ml-4 mt-1 text-sm text-gray-600 space-y-1">
                            {mod.lessons.map((l) => (
                              <li key={l.id}>• {l.title} ({l.duration})</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {program.reviews && program.reviews.length > 0 && (
                <section>
                  <h2 className="font-semibold text-gray-900 mb-4">Ulasan Peserta</h2>
                  <ul className="space-y-4">
                    {program.reviews.map((r) => (
                      <li key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{r.user}</span>
                          <span className="text-amber-500">★ {r.rating}</span>
                        </div>
                        <p className="text-gray-600 text-sm">{r.comment}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div>
              <div className="sticky top-24 border rounded-2xl p-6 bg-slate-50 shadow-sm">
                <p className="text-2xl font-bold text-primary mb-2">{program.priceDisplay}</p>
                <p className="text-sm text-gray-500 mb-6">Akses penuh materi, latihan, dan sertifikat</p>
                <a
                  href={`#/checkout?program=${program.slug}`}
                  className="block w-full text-center py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-colors"
                >
                  Daftar Program
                </a>
                <p className="mt-4 text-center text-xs text-gray-500">Pembayaran aman • Akses seumur hidup</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

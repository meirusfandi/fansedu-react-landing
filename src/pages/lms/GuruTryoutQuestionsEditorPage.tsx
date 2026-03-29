import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  fetchGuruTryoutPaperDraft,
  parseTryoutPaperFromApiResponse,
  saveGuruTryoutPaperToApi,
  type TryoutAttemptPaper,
} from '../../lib/api'

/** Contoh struktur yang kompatibel dengan parser lembar (sama seperti respons GET questions). */
const EMPTY_TEMPLATE: TryoutAttemptPaper = {
  title: 'Judul tryout',
  durationMinutes: 60,
  questions: [
    {
      id: 'q-1',
      order: 1,
      prompt: '2 + 2 = ?',
      questionType: 'multiple_choice',
      options: [
        { key: 'A', label: '3' },
        { key: 'B', label: '4' },
        { key: 'C', label: '5' },
      ],
    },
  ],
}

function paperToEditorJson(p: TryoutAttemptPaper): string {
  return JSON.stringify(
    {
      title: p.title,
      durationMinutes: p.durationMinutes,
      endsAt: p.endsAt,
      questions: p.questions.map((q) => ({
        id: q.id,
        order: q.order,
        prompt: q.prompt,
        bodyHtml: q.bodyHtml,
        imageUrl: q.imageUrl,
        questionType: q.questionType,
        options: q.options,
      })),
    },
    null,
    2,
  )
}

export default function GuruTryoutQuestionsEditorPage({ tryoutId }: { tryoutId: string }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadNote, setLoadNote] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadNote(null)
    setError(null)
    fetchGuruTryoutPaperDraft(tryoutId)
      .then((draft) => {
        if (cancelled) return
        if (draft && (draft.questions.length > 0 || (draft.title ?? '').trim())) {
          setText(paperToEditorJson(draft))
          setLoadNote('Dimuat dari API (draf lembar).')
        } else {
          setText(paperToEditorJson(EMPTY_TEMPLATE))
          setLoadNote(
            'Endpoint GET .../paper belum mengembalikan data — menampilkan template. Setelah backend siap, muat ulang halaman.',
          )
        }
      })
      .catch((err) => {
        if (cancelled) return
        setText(paperToEditorJson(EMPTY_TEMPLATE))
        setLoadNote(null)
        setError(err instanceof ApiError ? err.message : 'Gagal memuat draf dari server.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tryoutId])

  const onSave = useCallback(async () => {
    setMessage(null)
    setError(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      setError('JSON tidak valid — periksa koma, tanda kutip, atau kurung.')
      return
    }
    let paper: TryoutAttemptPaper
    try {
      paper = parseTryoutPaperFromApiResponse(parsed)
    } catch {
      setError('Struktur tidak bisa dipetakan ke lembar soal.')
      return
    }
    if (paper.questions.length === 0) {
      setError('Minimal satu soal agar lembar bisa dipakai siswa.')
      return
    }
    if (!Number.isFinite(paper.durationMinutes) || paper.durationMinutes < 1) {
      paper = { ...paper, durationMinutes: 60 }
    }
    setSaving(true)
    try {
      await saveGuruTryoutPaperToApi(tryoutId, paper)
      setMessage('Tersimpan — backend menerima permintaan. Verifikasi dengan GET paper atau mulai ujian sebagai siswa.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }, [text, tryoutId])

  if (loading) {
    return <div className="py-8 text-gray-500">Memuat draf lembar…</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center gap-4">
        <a href="#/guru/tryouts" className="text-primary font-medium text-sm hover:underline">
          ← Daftar tryout
        </a>
        <a
          href={`#/guru/tryouts/${encodeURIComponent(tryoutId)}`}
          className="text-sm text-gray-500 hover:text-primary hover:underline"
        >
          Analisis siswa
        </a>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Lembar soal (API)</h1>
        <p className="text-sm text-gray-500 mb-4">
          Tryout ID: <code className="text-xs bg-slate-100 px-1 rounded">{tryoutId}</code>
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Edit JSON di bawah lalu simpan. Frontend memanggil{' '}
          <strong>PUT atau POST</strong> ke <code className="text-xs bg-slate-100 px-1 rounded">/guru/tryouts/…/paper</code>{' '}
          (fallback <code className="text-xs bg-slate-100 px-1 rounded">/instructor/…</code>,{' '}
          <code className="text-xs bg-slate-100 px-1 rounded">/admin/…</code>). Backend harus memvalidasi, menyimpan ke
          database, dan mengembalikan lembar yang sama pada <strong>GET …/attempts/:id/questions</strong> untuk siswa.
        </p>
        {loadNote ? <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">{loadNote}</p> : null}
        {error ? <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p> : null}
        {message ? <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">{message}</p> : null}

        <label htmlFor="tryout-paper-json" className="block text-sm font-medium text-gray-700 mb-2">
          Payload lembar (JSON)
        </label>
        <textarea
          id="tryout-paper-json"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="w-full min-h-[min(60vh,28rem)] font-mono text-xs sm:text-sm rounded-xl border border-gray-200 p-4 text-gray-900 bg-slate-50 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave()}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? 'Menyimpan…' : 'Simpan ke API'}
          </button>
          <button
            type="button"
            onClick={() => {
              setText(paperToEditorJson(EMPTY_TEMPLATE))
              setMessage(null)
              setError(null)
            }}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Reset ke template contoh
          </button>
        </div>
      </div>
    </div>
  )
}

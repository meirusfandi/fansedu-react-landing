import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  getAdminCourseProgram,
  putAdminCourseLinkedTryouts,
  putAdminCourseProgram,
  type CourseMeetingProgramInput,
} from '../../lib/api'

function emptyMeeting(n: number): CourseMeetingProgramInput {
  return {
    meetingNumber: n,
    title: '',
    detailText: null,
    pdfUrl: null,
    prTitle: null,
    prDescription: null,
    liveClassUrl: null,
  }
}

function mergeMeetingsFromApi(rows: CourseMeetingProgramInput[]): CourseMeetingProgramInput[] {
  const byNum = new Map(rows.map((r) => [r.meetingNumber, r]))
  return Array.from({ length: 8 }, (_, i) => {
    const n = i + 1
    return byNum.get(n) ?? emptyMeeting(n)
  })
}

export default function GuruCourseProgramPage({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingTryouts, setSavingTryouts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [trackType, setTrackType] = useState<'meetings' | 'tryout'>('meetings')
  const [pretestId, setPretestId] = useState('')
  const [meetings, setMeetings] = useState<CourseMeetingProgramInput[]>(() =>
    Array.from({ length: 8 }, (_, i) => emptyMeeting(i + 1)),
  )
  const [tryoutIdsRaw, setTryoutIdsRaw] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getAdminCourseProgram(courseId)
      .then((data) => {
        if (!data) {
          setMeetings(Array.from({ length: 8 }, (_, i) => emptyMeeting(i + 1)))
          setTrackType('meetings')
          setPretestId('')
          return
        }
        setTrackType(data.trackType)
        setMeetings(mergeMeetingsFromApi(data.meetings))
        setPretestId(data.pretestTryoutSessionId ?? '')
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat program (periksa permission admin / courses.manage).')
      })
      .finally(() => setLoading(false))
  }, [courseId])

  useEffect(() => {
    load()
  }, [load])

  const updateMeeting = (index: number, patch: Partial<CourseMeetingProgramInput>) => {
    setMeetings((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const onSaveProgram = async () => {
    setSaving(true)
    setOkMsg(null)
    setError(null)
    try {
      await putAdminCourseProgram(courseId, {
        trackType,
        meetings: meetings.map((m) => ({
          ...m,
          title: m.title.trim(),
          detailText: m.detailText?.trim() || null,
          pdfUrl: m.pdfUrl?.trim() || null,
          prTitle: m.prTitle?.trim() || null,
          prDescription: m.prDescription?.trim() || null,
          liveClassUrl: m.liveClassUrl?.trim() || null,
        })),
        pretestTryoutSessionId: pretestId.trim() || null,
      })
      setOkMsg('Program tersimpan; learning journey di-rebuild di server.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan program.')
    } finally {
      setSaving(false)
    }
  }

  const onSaveLinkedTryouts = async () => {
    setSavingTryouts(true)
    setOkMsg(null)
    setError(null)
    try {
      const ids = tryoutIdsRaw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
      await putAdminCourseLinkedTryouts(courseId, ids)
      setOkMsg('Daftar tryout terhubung diperbarui.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan tryout terhubung.')
    } finally {
      setSavingTryouts(false)
    }
  }

  if (loading) return <div className="py-8 text-gray-500">Memuat form program…</div>

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <a href="#/guru/courses" className="text-sm text-primary hover:underline">
          ← Kursus Saya
        </a>
        <a
          href={`#/guru/courses/${encodeURIComponent(courseId)}/learn`}
          className="text-sm text-gray-600 hover:text-primary hover:underline"
        >
          Pratinjau journey
        </a>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Program kelas</h1>
      <p className="text-sm text-gray-600">
        PUT <code className="text-xs bg-slate-100 px-1 rounded">/admin/courses/…/program</code> — pertemuan 1–8, pre-test,
        track meetings vs tryout. Setelah simpan, siswa memuat journey lewat{' '}
        <code className="text-xs bg-slate-100 px-1 rounded">GET /courses/…/journey</code>.
      </p>

      {error ? (
        <div className="p-4 rounded-xl bg-amber-50 text-amber-900 text-sm">{error}</div>
      ) : null}
      {okMsg ? (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-900 text-sm">{okMsg}</div>
      ) : null}

      <div className="rounded-2xl border bg-white p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Track</label>
          <select
            value={trackType}
            onChange={(e) => setTrackType(e.target.value as 'meetings' | 'tryout')}
            className="rounded-lg border px-3 py-2 text-sm w-full max-w-md"
          >
            <option value="meetings">meetings (pertemuan + materi)</option>
            <option value="tryout">tryout (pre-test + tryout terhubung)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Pre-test tryout session ID (opsional)</label>
          <input
            value={pretestId}
            onChange={(e) => setPretestId(e.target.value)}
            placeholder="UUID sesi tryout"
            className="rounded-lg border px-3 py-2 text-sm w-full font-mono"
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 space-y-6">
        <h2 className="font-semibold text-gray-900">Pertemuan 1–8</h2>
        {meetings.map((m, i) => (
          <div key={m.meetingNumber} className="border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-800">Pertemuan {m.meetingNumber}</p>
            <input
              value={m.title}
              onChange={(e) => updateMeeting(i, { title: e.target.value })}
              placeholder="Judul"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <textarea
              value={m.detailText ?? ''}
              onChange={(e) => updateMeeting(i, { detailText: e.target.value || null })}
              placeholder="Ringkasan / detail teks"
              rows={2}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <input
              value={m.pdfUrl ?? ''}
              onChange={(e) => updateMeeting(i, { pdfUrl: e.target.value || null })}
              placeholder="URL PDF"
              className="w-full rounded-lg border px-3 py-2 text-sm font-mono text-xs"
            />
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                value={m.prTitle ?? ''}
                onChange={(e) => updateMeeting(i, { prTitle: e.target.value || null })}
                placeholder="Judul PR"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={m.liveClassUrl ?? ''}
                onChange={(e) => updateMeeting(i, { liveClassUrl: e.target.value || null })}
                placeholder="URL live class / meet"
                className="rounded-lg border px-3 py-2 text-sm font-mono text-xs"
              />
            </div>
            <textarea
              value={m.prDescription ?? ''}
              onChange={(e) => updateMeeting(i, { prDescription: e.target.value || null })}
              placeholder="Deskripsi PR"
              rows={2}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        ))}
        <button
          type="button"
          disabled={saving}
          onClick={onSaveProgram}
          className="rounded-xl bg-primary text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Menyimpan…' : 'Simpan program'}
        </button>
      </div>

      <div className="rounded-2xl border bg-white p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Tryout terhubung (track tryout)</h2>
        <p className="text-xs text-gray-500">
          PUT <code className="bg-slate-100 px-1 rounded">/admin/courses/…/linked-tryouts</code> — UUID sesi tryout, pisahkan
          koma atau baris baru.
        </p>
        <textarea
          value={tryoutIdsRaw}
          onChange={(e) => setTryoutIdsRaw(e.target.value)}
          placeholder="uuid-1, uuid-2"
          rows={3}
          className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
        />
        <button
          type="button"
          disabled={savingTryouts}
          onClick={onSaveLinkedTryouts}
          className="rounded-xl border border-primary text-primary px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {savingTryouts ? 'Menyimpan…' : 'Simpan tryout terhubung'}
        </button>
      </div>
    </div>
  )
}

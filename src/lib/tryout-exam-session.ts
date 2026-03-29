const STORAGE_KEY = 'fansedu-tryout-exam-session'

function decodeTryoutIdSegment(id: string): string {
  if (!id) return id
  try {
    return decodeURIComponent(id)
  } catch {
    return id
  }
}

export interface TryoutExamSessionMeta {
  expiresAt?: string | null
  timeLeftSeconds?: number | null
  startedAt?: string | null
}

export interface TryoutExamSession {
  tryoutId: string
  examUrl?: string
  attemptId: string | null
  savedAt: number
  /** Batas waktu dari server (ISO), dipakai untuk timer lintas navigasi */
  expiresAt?: string
  /** Date.now() + timeLeftSeconds saat mulai, jika API tidak kirim expiresAt */
  examDeadlineMs?: number
  startedAt?: string
}

export function saveTryoutExamSession(
  tryoutId: string,
  examUrl: string | null | undefined,
  attemptId?: string | null,
  meta?: TryoutExamSessionMeta,
): void {
  try {
    const trimmed = typeof examUrl === 'string' ? examUrl.trim() : ''
    let expiresAt: string | undefined
    let examDeadlineMs: number | undefined
    if (meta?.expiresAt != null && String(meta.expiresAt).trim()) {
      const iso = String(meta.expiresAt).trim()
      const ms = Date.parse(iso)
      if (Number.isFinite(ms)) expiresAt = iso
    }
    if (!expiresAt && meta?.timeLeftSeconds != null) {
      const sec = Math.trunc(Number(meta.timeLeftSeconds))
      if (Number.isFinite(sec) && sec > 0) {
        examDeadlineMs = Date.now() + sec * 1000
      }
    }
    const startedAt =
      meta?.startedAt != null && String(meta.startedAt).trim()
        ? String(meta.startedAt).trim()
        : undefined
    const payload: TryoutExamSession = {
      tryoutId,
      ...(trimmed ? { examUrl: trimmed } : {}),
      attemptId: attemptId ?? null,
      savedAt: Date.now(),
      ...(expiresAt ? { expiresAt } : {}),
      ...(examDeadlineMs != null ? { examDeadlineMs } : {}),
      ...(startedAt ? { startedAt } : {}),
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

export interface TryoutPaperTimingPatch {
  endsAt?: string
  timeLeftSeconds?: number
  durationMinutes?: number
}

/**
 * Pin deadline ke cache **sekali** saat belum ada — dipakai untuk timer 1× pengerjaan (tahan reload / pindah halaman).
 * Prioritas: endsAt ISO → timeLeftSeconds (anchor now) → durationMinutes (anchor now).
 */
export function persistTryoutExamDeadlineIfMissing(tryoutId: string, patch: TryoutPaperTimingPatch): void {
  try {
    const s = getTryoutExamSession(tryoutId)
    if (!s?.attemptId || s.expiresAt || s.examDeadlineMs) return
    const next: TryoutExamSession = { ...s, savedAt: Date.now() }
    if (patch.endsAt?.trim()) {
      const ms = Date.parse(patch.endsAt.trim())
      if (Number.isFinite(ms)) next.expiresAt = patch.endsAt.trim()
    } else if (patch.timeLeftSeconds != null) {
      const sec = Math.trunc(patch.timeLeftSeconds)
      if (Number.isFinite(sec) && sec > 0) {
        next.examDeadlineMs = Date.now() + sec * 1000
      }
    } else if (patch.durationMinutes != null) {
      const dm = Math.trunc(patch.durationMinutes)
      if (Number.isFinite(dm) && dm > 0) {
        next.examDeadlineMs = Date.now() + dm * 60 * 1000
      }
    }
    if (!next.expiresAt && next.examDeadlineMs == null) return
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

/** @deprecated gunakan persistTryoutExamDeadlineIfMissing */
export function extendTryoutExamSessionDeadlineIfEmpty(
  tryoutId: string,
  patch: { expiresAt?: string; timeLeftSeconds?: number },
): void {
  persistTryoutExamDeadlineIfMissing(tryoutId, {
    endsAt: patch.expiresAt,
    timeLeftSeconds: patch.timeLeftSeconds,
  })
}

/** Deadline absolut (ms) hanya dari session — satu sumber untuk counter. */
export function getTryoutExamDeadlineMs(tryoutId: string): number | null {
  const s = getTryoutExamSession(tryoutId)
  if (!s) return null
  if (s.expiresAt?.trim()) {
    const ms = Date.parse(s.expiresAt.trim())
    if (Number.isFinite(ms)) return ms
  }
  if (s.examDeadlineMs != null && Number.isFinite(s.examDeadlineMs)) {
    return s.examDeadlineMs
  }
  return null
}

/** Sisa detik berdasarkan cache mulai ujian; null = tidak bisa ditentukan dari cache. */
export function getRemainingSecondsFromCachedExam(s: TryoutExamSession): number | null {
  if (s.expiresAt?.trim()) {
    const ms = Date.parse(s.expiresAt.trim())
    if (Number.isFinite(ms)) return Math.max(0, Math.floor((ms - Date.now()) / 1000))
  }
  if (s.examDeadlineMs != null && Number.isFinite(s.examDeadlineMs)) {
    return Math.max(0, Math.floor((s.examDeadlineMs - Date.now()) / 1000))
  }
  return null
}

export function hasInProgressTryoutExam(tryoutId: string): boolean {
  const s = getTryoutExamSession(tryoutId)
  return Boolean(s?.attemptId)
}

export function clearTryoutExamSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function tryoutExamDraftKey(tryoutId: string, attemptId: string): string {
  return `fansedu-tryout-draft-${tryoutId}-${attemptId}`
}

export function getTryoutExamSession(expectedTryoutId: string): TryoutExamSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<TryoutExamSession>
    const expectedDecoded = decodeTryoutIdSegment(expectedTryoutId)
    if (
      typeof parsed.tryoutId !== 'string'
      || (parsed.tryoutId !== expectedTryoutId && parsed.tryoutId !== expectedDecoded)
    ) {
      return null
    }
    const examUrlStr = typeof parsed.examUrl === 'string' ? parsed.examUrl.trim() : ''
    const attemptStr = typeof parsed.attemptId === 'string' ? parsed.attemptId.trim() : ''
    if (!examUrlStr && !attemptStr) {
      return null
    }
    const examDeadlineMs =
      typeof parsed.examDeadlineMs === 'number' && Number.isFinite(parsed.examDeadlineMs)
        ? parsed.examDeadlineMs
        : undefined
    return {
      tryoutId: parsed.tryoutId,
      ...(examUrlStr ? { examUrl: examUrlStr } : {}),
      attemptId: attemptStr || null,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
      ...(typeof parsed.expiresAt === 'string' && parsed.expiresAt.trim()
        ? { expiresAt: parsed.expiresAt.trim() }
        : {}),
      ...(examDeadlineMs != null ? { examDeadlineMs } : {}),
      ...(typeof parsed.startedAt === 'string' && parsed.startedAt.trim()
        ? { startedAt: parsed.startedAt.trim() }
        : {}),
    }
  } catch {
    return null
  }
}

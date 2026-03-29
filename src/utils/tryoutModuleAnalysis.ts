/**
 * Agregasi hasil tryout per modul / topik (dari field soal atau tag).
 */

export interface TryoutModuleStat {
  moduleKey: string
  moduleLabel: string
  total: number
  correct: number
  wrong: number
  /** isCorrect tidak diketahui dari server */
  unknown: number
}

const GENERAL_KEY = '__general__'
const DEFAULT_LABEL = 'Umum'

/** Ekstrak grup modul dari satu objek soal/review (camelCase + snake_case umum). */
export function extractModuleFromPayload(item: Record<string, unknown>): { moduleKey: string; moduleLabel: string } | undefined {
  const modTitle =
    (typeof item.moduleTitle === 'string' && item.moduleTitle.trim()) ||
    (typeof item.module_title === 'string' && item.module_title.trim()) ||
    (typeof item.moduleName === 'string' && item.moduleName.trim()) ||
    (typeof item.module_name === 'string' && item.module_name.trim()) ||
    (typeof item.section === 'string' && item.section.trim()) ||
    (typeof item.sectionTitle === 'string' && item.sectionTitle.trim()) ||
    (typeof item.bidang === 'string' && item.bidang.trim()) ||
    (typeof item.materi === 'string' && item.materi.trim()) ||
    (typeof item.chapter === 'string' && item.chapter.trim()) ||
    (typeof item.topic === 'string' && item.topic.trim()) ||
    (typeof item.category === 'string' && item.category.trim())

  const modIdRaw =
    (typeof item.moduleId === 'string' && item.moduleId.trim()) ||
    (typeof item.module_id === 'string' && item.module_id.trim()) ||
    ''

  if (modTitle || modIdRaw) {
    const label = (modTitle || modIdRaw).trim()
    const key = (modIdRaw || label).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/gi, '')
    return { moduleKey: key || GENERAL_KEY, moduleLabel: label }
  }

  const tags = item.tags
  if (Array.isArray(tags) && tags.length > 0) {
    const first = tags.find((t) => typeof t === 'string' && t.trim()) as string | undefined
    if (first) {
      const label = first.trim()
      return {
        moduleKey: label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/gi, '') || GENERAL_KEY,
        moduleLabel: label,
      }
    }
  }

  return undefined
}

function ensureStat(
  map: Map<string, TryoutModuleStat>,
  key: string,
  label: string,
): TryoutModuleStat {
  const existing = map.get(key)
  if (existing) {
    if (existing.moduleLabel === DEFAULT_LABEL && label !== DEFAULT_LABEL) {
      existing.moduleLabel = label
    }
    return existing
  }
  const st: TryoutModuleStat = {
    moduleKey: key,
    moduleLabel: label,
    total: 0,
    correct: 0,
    wrong: 0,
    unknown: 0,
  }
  map.set(key, st)
  return st
}

type QuestionLike = { id: string; moduleKey?: string; moduleLabel?: string }
type ReviewLike = { questionId: string; isCorrect?: boolean; moduleKey?: string; moduleLabel?: string }

/**
 * Gabungkan lembar soal dengan baris review: hitung benar/salah/tidak dinilai per modul.
 * Urutan modul mengikuti kemunculan pertama di daftar soal.
 */
export function buildTryoutModuleStats(questions: QuestionLike[], reviewRows: ReviewLike[] | null): TryoutModuleStat[] {
  const rowById = new Map((reviewRows ?? []).map((r) => [r.questionId, r]))
  const stats = new Map<string, TryoutModuleStat>()
  const moduleOrder: string[] = []
  const seenModule = new Set<string>()

  const pushOrder = (key: string) => {
    if (!seenModule.has(key)) {
      seenModule.add(key)
      moduleOrder.push(key)
    }
  }

  for (const q of questions) {
    const row = rowById.get(q.id)
    const key = row?.moduleKey ?? q.moduleKey ?? GENERAL_KEY
    const label = row?.moduleLabel ?? q.moduleLabel ?? DEFAULT_LABEL
    pushOrder(key)
    const st = ensureStat(stats, key, label)
    st.total += 1
    if (row?.isCorrect === true) st.correct += 1
    else if (row?.isCorrect === false) st.wrong += 1
    else st.unknown += 1
  }

  for (const r of reviewRows ?? []) {
    if (questions.some((q) => q.id === r.questionId)) continue
    const key = r.moduleKey ?? GENERAL_KEY
    const label = r.moduleLabel ?? DEFAULT_LABEL
    pushOrder(key)
    const st = ensureStat(stats, key, label)
    st.total += 1
    if (r.isCorrect === true) st.correct += 1
    else if (r.isCorrect === false) st.wrong += 1
    else st.unknown += 1
  }

  return moduleOrder.map((k) => stats.get(k)).filter((s): s is TryoutModuleStat => s != null)
}

export function tryoutModuleInsight(rows: TryoutModuleStat[]): string | null {
  const graded = rows.filter((r) => r.correct + r.wrong > 0)
  if (graded.length === 0) return null

  const weakest = [...graded].sort((a, b) => {
    const ra = a.total > 0 ? a.correct / a.total : 0
    const rb = b.total > 0 ? b.correct / b.total : 0
    return ra - rb
  })[0]

  if (!weakest || weakest.total === 0) return null
  const pct = Math.round((100 * weakest.correct) / weakest.total)

  if (graded.length === 1) {
    return pct >= 75
      ? `Penguasaan pada topik "${weakest.moduleLabel}" terlihat kuat (${weakest.correct} dari ${weakest.total} benar). Pertahankan dan lanjutkan ke materi lanjutan.`
      : `Topik "${weakest.moduleLabel}" masih bisa ditingkatkan (${weakest.correct} dari ${weakest.total} benar, sekitar ${pct}%). Ulangi konsep di area ini sebelum tryout berikutnya.`
  }

  if (pct >= 72) {
    return 'Distribusi jawaban benar per modul relatif merata. Fokus berikutnya bisa pada modul yang paling dekat dengan materi OSN target Anda.'
  }

  return `Modul "${weakest.moduleLabel}" tampak paling perlu penguatan (${weakest.correct}/${weakest.total} benar, ~${pct}%). Disarankan mengulang materi ini dan mengerjakan latihan tambahan di topik yang sama.`
}

export function pctCorrect(stat: TryoutModuleStat): number | null {
  const graded = stat.correct + stat.wrong
  if (graded <= 0) return null
  return Math.round((100 * stat.correct) / graded)
}

import type { RegisterLevelOption } from '../lib/api'

export function getRegisterLevelById(
  levels: RegisterLevelOption[],
  levelId: string,
): RegisterLevelOption | null {
  return levels.find((lv) => lv.id === levelId) ?? null
}

export function isRegisterSelectionComplete(args: {
  levels: RegisterLevelOption[]
  levelId: string
  subjectId: string
  classLevel: string
  requireClass: boolean
}): boolean {
  const { levels, levelId, subjectId, classLevel, requireClass } = args
  if (levels.length === 0) return true
  if (!levelId || !subjectId) return false
  if (requireClass && !classLevel) return false
  return true
}

export function validateRegisterSelection(args: {
  levels: RegisterLevelOption[]
  levelId: string
  subjectId: string
  classLevel: string
  requireClass: boolean
}): string | null {
  const { levels, levelId, subjectId, classLevel, requireClass } = args
  if (levels.length === 0) return null

  const selected = getRegisterLevelById(levels, levelId)
  if (!selected) return 'Pilih jenjang pendidikan terlebih dahulu.'
  if (!subjectId) return 'Pilih bidang pelajaran terlebih dahulu.'
  if (!selected.subjects.some((s) => s.id === subjectId)) {
    return 'Bidang pelajaran tidak sesuai dengan jenjang yang dipilih.'
  }
  if (requireClass && !classLevel) return 'Pilih kelas terlebih dahulu.'
  if (classLevel && !selected.classes.some((c) => c.value === classLevel)) {
    return 'Kelas tidak sesuai dengan jenjang yang dipilih.'
  }
  return null
}

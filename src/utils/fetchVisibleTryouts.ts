import { getOpenTryouts, getStudentTryoutsOpen, type OpenTryoutItem } from '../lib/api'
import { filterStudentVisibleTryouts } from './tryoutStudent'

/**
 * Daftar tryout terbuka untuk tampilan (filter closeAt).
 * Siswa yang login: coba GET /student/tryouts/open dulu agar selaras dengan LMS; gagal → publik.
 * Tamu / guru: hanya GET /tryouts?status=open.
 */
export async function fetchVisibleTryoutsForViewer(opts: {
  preferStudentOpen: boolean
}): Promise<OpenTryoutItem[]> {
  if (opts.preferStudentOpen) {
    try {
      const list = await getStudentTryoutsOpen()
      return filterStudentVisibleTryouts(list)
    } catch {
      // 401/403/network atau endpoint belum ada → lanjut ke daftar publik
    }
  }
  const list = await getOpenTryouts()
  return filterStudentVisibleTryouts(list)
}

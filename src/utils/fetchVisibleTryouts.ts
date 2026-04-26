import { getOpenTryouts, getStudentTryoutsOpen, type OpenTryoutItem, type TryoutFilterParams } from '../lib/api'
import { filterStudentVisibleTryouts } from './tryoutStudent'

/**
 * Daftar tryout terbuka untuk tampilan (filter closeAt).
 * Siswa yang login: coba GET /student/tryouts/open dulu agar selaras dengan LMS; gagal → publik.
 * Tamu / guru: hanya GET /tryouts?status=open.
 *
 * Filter opsional `subject` dan `level` diteruskan ke endpoint siswa sebagai query param.
 */
export async function fetchVisibleTryoutsForViewer(opts: {
  preferStudentOpen: boolean
  filter?: TryoutFilterParams
}): Promise<OpenTryoutItem[]> {
  if (opts.preferStudentOpen) {
    try {
      const list = await getStudentTryoutsOpen(opts.filter)
      return filterStudentVisibleTryouts(list)
    } catch {
      // 401/403/network atau endpoint belum ada → lanjut ke daftar publik
    }
  }
  const list = await getOpenTryouts()
  return filterStudentVisibleTryouts(list)
}

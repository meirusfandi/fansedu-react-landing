import { getCodingProblems, CODING_TOPICS } from '../../data/codingProblems'

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  hard: 'bg-red-100 text-red-800',
}
const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Mudah',
  medium: 'Sedang',
  hard: 'Sulit',
}

export default function StudentCodingPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Belajar Coding</h1>
      <p className="text-gray-500 mb-2">
        Materi coding dalam course: tulis program C++, test, dan jalankan di platform ini. Referensi: TLX Toki Learning, HackerRank, LeetCode — interactive code training dengan auto grading.
      </p>
      <p className="text-sm text-gray-500 mb-8">
        Pilih soal di bawah untuk membuka editor C++, menjalankan kode (Run), dan submit solusi.
      </p>

      {/* Referensi */}
      <div className="flex flex-wrap gap-2 mb-8">
        <span className="text-xs text-gray-500">Referensi:</span>
        <a href="https://tlx.toki.id" target="_blank" rel="noreferrer noopener" className="text-xs text-primary hover:underline">TLX Toki</a>
        <span className="text-gray-300">·</span>
        <a href="https://www.hackerrank.com" target="_blank" rel="noreferrer noopener" className="text-xs text-primary hover:underline">HackerRank</a>
        <span className="text-gray-300">·</span>
        <a href="https://leetcode.com" target="_blank" rel="noreferrer noopener" className="text-xs text-primary hover:underline">LeetCode</a>
      </div>

      {/* Materi Coding — Daftar Soal */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Materi Coding — Soal Programming (C++)</h2>
        <div className="border rounded-2xl overflow-hidden bg-white">
          <div className="grid grid-cols-1 divide-y divide-gray-100">
            {getCodingProblems().map((p) => (
              <a
                key={p.id}
                href={`#/student/coding/problem/${p.slug}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                    {p.id}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.title}</p>
                    <p className="text-xs text-gray-500">
                      {CODING_TOPICS.find((t) => t.id === p.topic)?.label ?? p.topic}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLOR[p.difficulty] ?? 'bg-gray-100 text-gray-700'}`}>
                  {DIFFICULTY_LABEL[p.difficulty] ?? p.difficulty}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Blok fitur */}
      <div className="space-y-8">
        <section className="border rounded-2xl p-6 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">✓</span>
            <h2 className="text-lg font-semibold text-gray-900">Auto Grading</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Kirim solusi kode C++ Anda dan dapatkan penilaian otomatis. Sistem memeriksa keluaran terhadap test case (seperti TLX, HackerRank, LeetCode) dan memberi skor serta feedback.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">C++</span>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Test case</span>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Instant feedback</span>
          </div>
        </section>

        <section className="border rounded-2xl p-6 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">1</span>
            <h2 className="text-lg font-semibold text-gray-900">Soal Programming (Basic)</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Soal dari dasar: input/output, percabangan, perulangan, array, fungsi. Cocok untuk pemula dan persiapan OSN/kompetisi.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Input / output dasar</li>
            <li>Percabangan (if, switch)</li>
            <li>Perulangan (for, while)</li>
            <li>Array & string</li>
            <li>Fungsi & prosedur</li>
          </ul>
        </section>

        <section className="border rounded-2xl p-6 bg-white border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">◐</span>
            <h2 className="text-lg font-semibold text-gray-900">Interactive Code Training (C++)</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Tulis kode C++ di editor, jalankan (Run) dengan custom input, dan lihat output. Submit solusi untuk dinilai — pengalaman mirip TLX Toki Learning, HackerRank, LeetCode.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">Editor C++</span>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">Run & cek output</span>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">Submit & grading</span>
          </div>
        </section>
      </div>
    </div>
  )
}

/**
 * Materi coding & soal programming (referensi: TLX Toki, HackerRank, LeetCode).
 * Daftar soal bisa dari data statis ini atau auto-generate dari AI/API (GET /api/v1/coding/problems).
 * Rute detail: #/student/coding/problem/:slug
 */

export interface CodingProblem {
  id: string
  slug: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  topic: string
  statement: string
  sampleInput: string
  sampleOutput: string
  /** Template kode C++ awal */
  template: string
}

export const CODING_TOPICS = [
  { id: 'basic', label: 'Dasar Pemrograman', slug: 'basic' },
  { id: 'io', label: 'Input / Output', slug: 'io' },
  { id: 'branching', label: 'Percabangan', slug: 'branching' },
  { id: 'loop', label: 'Perulangan', slug: 'loop' },
  { id: 'array', label: 'Array & String', slug: 'array' },
  { id: 'function', label: 'Fungsi & Prosedur', slug: 'function' },
] as const

export const CODING_PROBLEMS: CodingProblem[] = [
  {
    id: '1',
    slug: 'hello-world',
    title: 'Hello World',
    difficulty: 'easy',
    topic: 'io',
    statement: `Tulis program C++ yang mencetak tepat satu baris: **Hello, World!**

**Format keluaran:** Satu baris berisi teks \`Hello, World!\`

**Contoh:** (lihat sample output)`,
    sampleInput: '',
    sampleOutput: 'Hello, World!',
    template: `#include <iostream>
using namespace std;

int main() {
    // Tulis kode Anda di sini
    return 0;
}`,
  },
  {
    id: '2',
    slug: 'jumlah-dua-bilangan',
    title: 'Jumlah Dua Bilangan',
    difficulty: 'easy',
    topic: 'io',
    statement: `Baca dua bilangan bulat dari input, lalu cetak jumlahnya.

**Format masukan:** Satu baris berisi dua bilangan bulat A dan B, dipisah spasi.

**Format keluaran:** Satu baris berisi satu bilangan bulat (A + B).

**Contoh:**
- Masukan: \`3 5\`
- Keluaran: \`8\``,
    sampleInput: '3 5',
    sampleOutput: '8',
    template: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    // Cetak a + b
    return 0;
}`,
  },
  {
    id: '3',
    slug: 'ganjil-genap',
    title: 'Ganjil atau Genap',
    difficulty: 'easy',
    topic: 'branching',
    statement: `Baca sebuah bilangan bulat N. Jika N genap cetak "genap", jika ganjil cetak "ganjil".

**Format masukan:** Satu baris berisi satu bilangan bulat N.

**Format keluaran:** Satu baris berisi "genap" atau "ganjil" (tanpa tanda petik).`,
    sampleInput: '4',
    sampleOutput: 'genap',
    template: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    if (n % 2 == 0) {
        cout << "genap" << endl;
    } else {
        cout << "ganjil" << endl;
    }
    return 0;
}`,
  },
  {
    id: '4',
    slug: 'jumlah-1-n',
    title: 'Jumlah 1 sampai N',
    difficulty: 'easy',
    topic: 'loop',
    statement: `Baca sebuah bilangan bulat N (1 ≤ N ≤ 1000). Cetak jumlah 1 + 2 + ... + N.

**Rumus:** \`N * (N + 1) / 2\` atau gunakan perulangan.

**Contoh:** N = 5 → keluaran 15`,
    sampleInput: '5',
    sampleOutput: '15',
    template: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int sum = 0;
    for (int i = 1; i <= n; i++) {
        sum += i;
    }
    cout << sum << endl;
    return 0;
}`,
  },
]

export function getProblemBySlug(slug: string): CodingProblem | undefined {
  return CODING_PROBLEMS.find((p) => p.slug === slug)
}

/** Daftar soal untuk list (bisa diganti dengan fetch dari API/AI nantinya) */
export function getCodingProblems(): CodingProblem[] {
  return CODING_PROBLEMS
}

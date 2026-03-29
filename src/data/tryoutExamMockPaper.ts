/**
 * Soal demo untuk `VITE_TRYOUT_EXAM_MOCK=true` — backend belum wajib menyediakan paper API.
 */

export const TRYOUT_EXAM_MOCK_QUESTIONS: Array<{
  id: string
  prompt: string
  options: { key: string; label: string }[]
}> = [
  {
    id: 'mock-1',
    prompt:
      'Bilangan bulat positif terkecil yang habis dibagi 12 dan 18 sekaligus adalah …',
    options: [
      { key: 'A', label: '36' },
      { key: 'B', label: '72' },
      { key: 'C', label: '6' },
      { key: 'D', label: '24' },
    ],
  },
  {
    id: 'mock-2',
    prompt: 'Jika 2^x = 32, maka nilai x adalah …',
    options: [
      { key: 'A', label: '4' },
      { key: 'B', label: '5' },
      { key: 'C', label: '6' },
      { key: 'D', label: '3' },
    ],
  },
  {
    id: 'mock-3',
    prompt: 'Kompleksitas waktu terbaik untuk pencarian biner pada array terurut berukuran n adalah …',
    options: [
      { key: 'A', label: 'O(n)' },
      { key: 'B', label: 'O(log n)' },
      { key: 'C', label: 'O(n log n)' },
      { key: 'D', label: 'O(1)' },
    ],
  },
  {
    id: 'mock-4',
    prompt: 'Struktur data FIFO (first-in-first-out) yang umum dipakai untuk BFS pada graf adalah …',
    options: [
      { key: 'A', label: 'Stack' },
      { key: 'B', label: 'Queue' },
      { key: 'C', label: 'Heap' },
      { key: 'D', label: 'Hash map' },
    ],
  },
  {
    id: 'mock-5',
    prompt: 'Pada bahasa C++, deklarasi pointer ke integer yang benar adalah …',
    options: [
      { key: 'A', label: 'int p*;' },
      { key: 'B', label: 'int* p;' },
      { key: 'C', label: 'pointer int p;' },
      { key: 'D', label: '*int p;' },
    ],
  },
  {
    id: 'mock-6',
    prompt: 'Jumlah deret aritmetika 1 + 2 + … + 10 sama dengan …',
    options: [
      { key: 'A', label: '45' },
      { key: 'B', label: '55' },
      { key: 'C', label: '50' },
      { key: 'D', label: '100' },
    ],
  },
  {
    id: 'mock-7',
    prompt: 'Prinsip induksi matematika dipakai untuk membuktikan pernyataan yang berlaku untuk …',
    options: [
      { key: 'A', label: 'Hanya satu bilangan bulat' },
      { key: 'B', label: 'Semua bilangan bulat tak negatif (atau subset terkait)' },
      { key: 'C', label: 'Hanya bilangan prima' },
      { key: 'D', label: 'Hanya bilangan real' },
    ],
  },
  {
    id: 'mock-8',
    prompt: 'Pada graf tidak berarah, jumlah derajat semua simpul selalu …',
    options: [
      { key: 'A', label: 'Ganjil' },
      { key: 'B', label: 'Genap' },
      { key: 'C', label: 'Sama dengan jumlah sisi' },
      { key: 'D', label: 'Tak terbatas' },
    ],
  },
]

# Rute Belajar Coding (Review)

Daftar soal bisa **auto-generate** dari data statis (`src/data/codingProblems.ts`) atau nantinya dari API/AI (mis. `GET /api/v1/coding/problems`).

## Rute

| Halaman | URL (hash) | Keterangan |
|--------|------------|------------|
| Daftar materi / soal | `#/student/coding` | List "Materi Coding — Soal Programming (C++)", klik masuk ke detail |
| Detail soal + Interactive Coding | `#/student/coding/problem/:slug` | Soal + editor C++, Run, Submit, Output |

## URL untuk review (dev)

- List: `http://localhost:5173/#/student/coding`
- Detail Hello World: `http://localhost:5173/#/student/coding/problem/hello-world`
- Detail Jumlah Dua Bilangan: `http://localhost:5173/#/student/coding/problem/jumlah-dua-bilangan`
- Detail Ganjil atau Genap: `http://localhost:5173/#/student/coding/problem/ganjil-genap`
- Detail Jumlah 1 sampai N: `http://localhost:5173/#/student/coding/problem/jumlah-1-n`

**Prasyarat:** Login sebagai siswa, lalu buka URL di atas (atau dari menu **Belajar Coding** → pilih salah satu soal).

## Isi halaman detail (untuk review)

1. **Navigasi:** "← Kembali ke daftar soal" dan breadcrumb Belajar Coding / [Judul soal]
2. **Kolom kiri:** Deskripsi soal, Sample Input, Sample Output
3. **Kolom kanan (Interactive Coding):**
   - Editor C++ (tulis kode, test & run)
   - Custom Input (untuk Run)
   - Tombol Run dan Submit
   - Area Output

Run memakai Piston API jika tersedia; jika gagal (mis. CORS), tampil simulasi output.

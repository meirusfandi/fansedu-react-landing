# Audit Flow: Landing → Pembelian Kelas & Daftar Tryout Gratis

Dokumen ini merangkum alur dari landing page hingga proses pembelian kelas dan daftar tryout gratis, serta perbaikan yang telah diterapkan.

---

## 1. Landing Page

| Element | Tujuan | Rute / Link | Status |
|--------|--------|-------------|--------|
| Navbar: Fitur, Program, Testimoni, TryOut Gratis, dll. | Scroll ke section | `#packages`, `#tryout`, dll. | ✅ |
| Navbar: Masuk / Daftar | Auth | Masuk → `#/auth`, Daftar → `#/auth?tab=register` | ✅ (sudah ditambah Daftar) |
| Navbar: Dashboard | Setelah login | `#/student` atau `#/instructor` | ✅ |
| Hero: Daftar Sekarang | Register | `#/auth?tab=register` | ✅ |
| Hero: Tanya Program | WA | External link | ✅ |
| Section Program (packages) | Lihat program | Kartu → `#/program/:slug` | ✅ |
| Section Program: Lihat semua | Katalog | `#/catalog` | ✅ (sudah ditambah) |
| Section TryOut Gratis: CTA | Daftar akun dulu untuk ikut tryout | `#/auth?tab=register`; teks: "Daftar akun untuk ikut TryOut" | ✅ |
| Section Siap Lolos OSN-K: CTA | Register | `#/auth?tab=register` | ✅ |
| Sticky CTA mobile | Register | `#/auth?tab=register` | ✅ |

---

## 2. Flow Pembelian Kelas

| Langkah | Halaman | Action | Next |
|---------|---------|--------|------|
| 1 | Landing | Klik kartu program atau "Lihat semua di Katalog" | `#/program/:slug` atau `#/catalog` |
| 2 | Katalog | Klik kartu program | `#/program/:slug` |
| 3 | Detail program | Klik "Daftar Program" | `#/checkout?program=:slug` |
| 4 | Checkout | Isi data diri (auto dari user jika login) → Lanjutkan | Step payment |
| 5 | Checkout | Pilih metode bayar, (opsional) kode promo → Bayar & Daftar Program | API payment-session → redirect paymentUrl atau `#/checkout/success` |
| 6 | Success | "Mulai Belajar" | `#/student/courses` (reset checkout state) |

**Catatan:** Checkout bisa dilakukan tanpa login (guest). Setelah sukses, halaman success mengingatkan: "Jika Anda punya akun, masuk untuk mengakses kursus di dashboard."

**Perbaikan yang diterapkan:**
- Ringkasan pesanan menampilkan Order ID & Total dari response API initiate.
- Payment-session selalu mengirim `promoCode` (string kosong jika tidak diisi).
- Saat ganti program (slug berubah), state checkout di-reset.

---

## 3. Flow Daftar Tryout Gratis

| Langkah | Halaman | Action | Next |
|---------|---------|--------|------|
| 1 | Landing | Klik "TryOut Gratis" di navbar (scroll) atau scroll ke section tryout | Section `#tryout` |
| 2 | Landing section tryout | Klik "Ikuti TryOut Gratis" | `#/tryout` (list tryout) |
| 3 | Daftar TryOut (list) | Klik salah satu tryout open | `#/tryout-info/:tryoutId` (detail per ID, data dari API + filter `closeAt`) |
| 4 | Detail TryOut (publik) | Baca info, daftar akun atau masuk | Register dengan `redirect` ke hash detail yang sama; siswa login → **`#/student/tryout/:id`** untuk daftar & ujian |
| 5 | Auth (Register) | Isi form daftar → Daftar | Redirect ke hash `redirect` (mis. `#/tryout-info/:id`) |

**Perbaikan yang diterapkan:**
- Register dari halaman publik memakai `redirect` ke hash detail yang relevan (mis. `%23%2Ftryout-info%2F{tryoutId}`) agar setelah daftar user kembali ke tryout yang sama.
- Halaman `#/tryout` (daftar): siswa yang sudah login mendapat pintasan **Daftar & ujian (LMS)** per kartu ke `#/student/tryout/:id`, plus link navbar/footer ke `#/student/tryout`.

**Akses utama (siswa sudah login):**
- Dashboard siswa → menu **Tryout** → `#/student/tryout` (list dari API siswa) → `#/student/tryout/:id` (detail, daftar, mulai ujian).
- Halaman publik `#/tryout-info/:id` menyelaraskan jadwal/meta dengan API yang sama (hanya tryout yang masih `open` menurut `closeAt`); CTA siswa mengarah ke **`#/student/tryout/:id`**, bukan hanya `#/tryout-info` generik.

---

## 4. Rute Penting

| Rute | Halaman | Keterangan |
|------|---------|------------|
| `#/` | Landing (App) | Beranda |
| `#/catalog` | Katalog program | List program (dari API packages) |
| `#/program/:slug` | Detail program | Dari packages, tombol ke checkout |
| `#/checkout?program=:slug` | Checkout | Initiate → payment-session → success |
| `#/checkout/success` | Success | Lalu "Mulai Belajar" → student/courses |
| `#/tryout` | Daftar tryout (public) | List tryout open → klik ke detail |
| `#/tryout-info` atau `#/tryout-info/:tryoutId` | Detail tryout (publik) | Info dari API, filter tutup; CTA ke auth & LMS siswa |
| `#/student/tryout`, `#/student/tryout/:id` | Tryout LMS siswa | Daftar, mulai ujian, leaderboard |
| `#/auth`, `#/auth?tab=register` | Login / Daftar | Redirect setelah login/daftar via query `redirect` |
| `#/student`, `#/student/courses`, `#/student/tryout`, dll. | Dashboard siswa | Setelah login |

---

## 5. Bagian yang Perlu Diperhatikan ke Depan

- **Guest checkout:** Setelah bayar, akses kursus bisa bergantung pada backend (magic link, auto-login, atau wajib login dengan akun yang terdaftar). Halaman success sudah mengingatkan untuk masuk jika punya akun.
- **Tryout — sisi backend:** Skor, persentil, `graded`, pembahasan (`GET …/review`), analisis guru (`GET …/analysis`), dan simpan lembar (`PUT …/paper`) harus konsisten di API; frontend sudah menampilkan fallback/teks penjelasan bila endpoint belum ada.
- **Publik vs siswa — sumber data:** Daftar publik memakai `GET /tryouts?status=open`; LMS siswa memakai `GET /student/tryouts/open` (dengan fallback). Jika kedua sumber tidak sinkron, pertimbangkan satu endpoint publik yang sudah difilter bidang atau dokumentasikan perbedaan itu.
- **Sesi ujian:** Cache `sessionStorage` dipisah per `tryoutId` (`fansedu-tryout-exam:<id>`), sehingga siswa bisa punya progres berbeda di beberapa tryout tanpa saling menimpa (migrasi otomatis dari kunci global lama).
- **Katalog:** Data list dari `GET /api/v1/packages`. Filter/search/pagination di client; jika backend menyediakan query param, bisa diseragamkan.

---

## 7. Checklist fitur Tryout (frontend vs backend)

| Area | Frontend | Tergantung backend |
|------|----------|-------------------|
| Publik: filter `closeAt`, meta API, CTA ke LMS | ✅ | Kirim `durationMinutes`, `questionCount`, dll. di `GET /tryouts` |
| LMS: lembar, timer, jawaban, submit | ✅ | `GET …/questions`, `PUT …/answers`, `POST …/submit` |
| Skor 0 / penilaian async | Pesan penjelasan | `graded`, skor final, field respons |
| Pembahasan setelah submit | ✅ fetch opsional | `GET …/review` atau `…/breakdown` |
| Guru: analisis per soal | ✅ tabel | `GET /guru/tryouts/:id/analysis` |
| Guru: impor lembar JSON | ✅ editor | `GET/PUT …/paper` |
| Iframe-only ujian | Peringatan UX | Sinkron attempt/skor jika ujian eksternal |

---

## 6. Ringkasan Perbaikan yang Dilakukan

1. **Landing navbar:** Tambah link "Daftar" (ke `#/auth?tab=register`) di samping "Masuk" untuk pengunjung belum login; menu mobile juga menampilkan Masuk dan Daftar.
2. **Section Program:** Tambah link "Lihat semua di Katalog →" ke `#/catalog`.
3. **Tryout (publik + LMS):** `TryoutInfo` / `#/tryout` selaras dengan filter & CTA ke `#/student/tryout/:id`; `FLOW_AUDIT` §3 & §7 diperbarui.
4. **Checkout success:** Tambah kalimat pengingat: "Jika Anda punya akun, masuk untuk mengakses kursus di dashboard."

Dengan ini, flow dari landing → pembelian kelas dan flow daftar tryout gratis tetap konsisten dan lengkap.

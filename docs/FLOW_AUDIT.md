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
| 3 | Daftar TryOut (list) | Klik salah satu tryout open | `#/tryout-info` (detail) |
| 4 | Detail TryOut | Baca info, klik "Daftar TryOut" (jika pendaftaran dibuka) | `#/auth?tab=register&redirect=%23%2Ftryout-info` |
| 5 | Auth (Register) | Isi form daftar → Daftar | Redirect ke `#/tryout-info` (kembali ke detail tryout) |

**Perbaikan yang diterapkan:**
- Link "Daftar TryOut" di halaman detail tryout sekarang membawa query `redirect=%23%2Ftryout-info` sehingga setelah register user diarahkan kembali ke halaman detail tryout.

**Alternatif akses (siswa sudah login):**
- Dashboard siswa → menu "Tryout" → `#/student/tryout` (list) → klik item → `#/tryout-info`.
- Dashboard siswa → kartu "TryOut OSN" → `#/student/tryout` → sama seperti di atas.

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
| `#/tryout-info` | Detail tryout | Info, jadwal, soal, tombol Daftar TryOut |
| `#/auth`, `#/auth?tab=register` | Login / Daftar | Redirect setelah login/daftar via query `redirect` |
| `#/student`, `#/student/courses`, `#/student/tryout`, dll. | Dashboard siswa | Setelah login |

---

## 5. Bagian yang Perlu Diperhatikan ke Depan

- **Guest checkout:** Setelah bayar, akses kursus bisa bergantung pada backend (magic link, auto-login, atau wajib login dengan akun yang terdaftar). Halaman success sudah mengingatkan untuk masuk jika punya akun.
- **Tryout:** Pendaftaran tryout saat ini mengarahkan ke daftar akun (register). Jika nanti ada endpoint daftar tryout per user (setelah login), bisa ditambah tombol "Daftar TryOut" yang memanggil API dan hanya tampil jika user sudah login.
- **Katalog:** Data list dari `GET /api/v1/packages`. Filter/search/pagination di client; jika backend menyediakan query param, bisa diseragamkan.

---

## 6. Ringkasan Perbaikan yang Dilakukan

1. **Landing navbar:** Tambah link "Daftar" (ke `#/auth?tab=register`) di samping "Masuk" untuk pengunjung belum login; menu mobile juga menampilkan Masuk dan Daftar.
2. **Section Program:** Tambah link "Lihat semua di Katalog →" ke `#/catalog`.
3. **Tryout detail:** Link "Daftar TryOut" memakai `redirect=%23%2Ftryout-info` agar setelah register user kembali ke halaman detail tryout.
4. **Checkout success:** Tambah kalimat pengingat: "Jika Anda punya akun, masuk untuk mengakses kursus di dashboard."

Dengan ini, flow dari landing → pembelian kelas dan flow daftar tryout gratis tetap konsisten dan lengkap.

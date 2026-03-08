# Prompt: Implementasi Fitur LMS Berdasarkan Program & Landing Page Fansedu

Gunakan prompt ini untuk membangun atau menambah fitur di LMS Anda agar selaras dengan program dan janji fitur di landing page Fansedu (persiapan OSN Informatika).

---

## Konteks Bisnis

- **Produk:** Pelatihan persiapan OSN (Olimpiade Sains Nasional) bidang Informatika untuk siswa SMA.
- **Value proposition:** Kurikulum terstruktur dari dasar sampai siap lomba, tryout nasional untuk simulasi nyata, pembahasan mendalam oleh mentor berpengalaman.
- **Target:** Siswa SMA dan guru pembimbing OSN.

---

## Program yang Harus Didukung LMS

LMS harus bisa mengelola **program/course** berikut beserta atributnya. Setiap program punya: nama, slug, durasi, materi (learning outcomes), fasilitas, harga (early bird / normal), dan untuk bundle ada bonus.

### 1. Algorithm & Programming Foundation

- **Slug:** `algorithm-programming-foundation`
- **Durasi:** 4 Minggu
- **Materi / learning outcomes:**
  - Menyelesaikan soal algoritma dasar
  - Menggunakan C++ untuk kompetisi
  - Teknik problem solving olimpiade
  - Struktur data dasar
- **Fasilitas yang harus ada di LMS:**
  - **2x Live Class per minggu** — jadwal live session (video call / webinar) per minggu, bisa di-enroll per program
  - **Latihan soal terstruktur** — bank soal per modul/topik, bisa dikerjakan kapan saja
  - **Rekaman kelas (record class)** — arsip rekaman setiap live class, akses tanpa batas waktu
  - **Forum diskusi peserta** — forum/grup diskusi per cohort/program
- **Pricing (referensi):** Early Bird Rp249.000, Normal Rp399.000

### 2. Pelatihan Intensif OSN-K 2026 Informatika

- **Slug:** `pelatihan-intensif-osn-k-2026`
- **Durasi:** 4 Minggu
- **Materi / learning outcomes:**
  - Strategi lolos seleksi OSN tingkat sekolah & kabupaten
  - Algoritma yang sering keluar di OSN
  - Soal tipe olimpiade dengan pembahasan mendalam
  - Problem solving & computational thinking terarah
- **Fasilitas yang harus ada di LMS:**
  - **2x Live Class per minggu**
  - **2x Tryout Nasional** — tryout dengan format mirip OSN, jadwal tetap per batch, hasil masuk ranking nasional
  - **Video pembahasan soal** — video pembahasan per soal atau per tryout
  - **Dashboard ranking nasional peserta** — leaderboard per tryout / agregat per batch, bisa filter per program/cohort
- **Pricing (referensi):** Early Bird Rp349.000, Normal Rp500.000

### 3. Kelas Gabungan (Bundle: Foundation + OSN-K 2026)

- **Slug:** `kelas-gabungan-foundation-osnk`
- **Tampilan:** "Foundation + OSN Training" (bundle)
- **Durasi:** 6 Minggu
- **Materi:** Gabungan kedua program di atas (dari dasar C++ sampai siap OSN-K)
- **Fasilitas:** Gabungan: 2x Live Class per minggu (gabungan), latihan terstruktur + 2x Tryout Nasional, rekaman + video pembahasan, forum diskusi + dashboard ranking nasional
- **Bonus (wajib ada di LMS):**
  - Bank soal OSN
  - Rekaman kelas
  - Grup diskusi
- **Pricing (referensi):** Normal Rp899.000, Early Bird Rp549.000 (hemat Rp350.000)

---

## Fitur LMS yang Dijanjikan di Landing Page (Harus Diimplementasi)

Implementasikan fitur-fitur berikut agar pengalaman pengguna sesuai janji di landing page.

### A. Manajemen Program & Enrollment

- **Program/Course:** Entitas dengan nama, slug, deskripsi, durasi (minggu), daftar materi (learning outcomes), daftar fasilitas.
- **Bundle:** Program yang mengkombinasikan 2+ program (enrollment ke bundle = akses ke semua program terkait). Support atribut: bundle subtitle, bonus (list string).
- **Cohort/Batch:** Per program bisa punya banyak batch (mis. Batch April 2026) dengan kuota (mis. 50 siswa), tanggal mulai/akhir, tenggat Early Bird.
- **Enrollment:** Siswa daftar per batch; status early bird/normal menentukan harga.

### B. Live Class & Rekaman

- **Live Class:** Jadwal tetap per minggu (mis. 2x per minggu per program), link meeting (Zoom/Meet/dll), reminder (email/notifikasi).
- **Rekaman kelas:** Setiap sesi live bisa di-record; rekaman diarsipkan dan bisa diakses peserta tanpa batas waktu (arsip lengkap).

### C. Bank Soal & Latihan

- **Bank soal:** Soal per topik/modul (algoritma dasar, C++, struktur data, dll.); bisa dipakai untuk latihan terstruktur dan untuk tryout.
- **Latihan terstruktur:** Soal dikelompokkan per modul; siswa bisa mengerjakan kapan saja, ada pembahasan (teks/video).
- **Target skala:** Minimal support 500+ soal (landing page menyebut "500+ soal latihan").

### D. Tryout Nasional

- **Tryout gratis (lead magnet):** Tryout OSN format resmi, gratis, tanpa harus beli program. Flow: daftar tryout → kerjakan → lihat ranking → dapat analisis hasil → (opsional) rekomendasi program.
- **Tryout berbayar (dalam program):** 2x Tryout Nasional per batch untuk program OSN-K dan Bundle; format mirip OSN, batas waktu, submit jawaban.
- **Fitur tryout:** Timer, submit jawaban, koreksi otomatis (jika applicable), skor per soal/section.

### E. Ranking & Dashboard

- **Dashboard ranking nasional:** Leaderboard per tryout (nasional), bisa per batch atau agregat. Menampilkan: peringkat, nama (atau anonym), skor, sekolah (opsional).
- **Analisis hasil:** Setelah tryout, peserta bisa lihat: skor total, breakdown per topik/soal, kekuatan & area yang perlu ditingkatkan (untuk konversi ke program berbayar).

### F. Pembahasan & Konten

- **Pembahasan mendalam:** Setiap soal (latihan atau tryout) punya pembahasan: teks dan/atau video. Landing page menjanjikan "100% pembahasan mendalam".
- **Video pembahasan soal:** Koleksi video per soal atau per tryout, akses sesuai program/bundle.

### G. Komunitas & Support

- **Forum diskusi peserta:** Forum atau grup diskusi per program/cohort; peserta bisa tanya jawab, share progress.
- **Grup diskusi (bonus bundle):** Akses grup diskusi sebagai bagian bonus bundle.
- **Konsultasi mentor (opsional):** Landing menyebut "mentor berpengalaman"; LMS bisa support jadwal konsultasi 1-on-1 atau Q&A terjadwal.

### H. Akses & UX

- **Akses 24/7:** Materi, rekaman, latihan, dan bank soal bisa diakses kapan saja (tidak hanya saat live).
- **Kurikulum terstruktur:** Konten disusun per modul/minggu agar siswa tidak "bingung mulai dari mana".
- **Arsip lengkap:** Rekaman pelatihan dan pembahasan tersedia tanpa batas waktu setelah enrollment.

### I. Harga & Promo

- **Early Bird vs Normal:** Per batch, support dua harga (early bird / normal) dan tenggat early bird.
- **Kuota per batch:** Mis. 50 siswa per batch; tampilkan di halaman program dan di LMS (sisa kuota).

---

## Checklist Implementasi LMS

Gunakan checklist ini untuk memastikan tidak ada janji di landing yang tertinggal.

- [ ] **Program:** CRUD program dengan slug, durasi, materi, fasilitas; support bundle (gabungan program + bonus).
- [ ] **Cohort/Batch:** Per program punya batch dengan kuota, jadwal, early bird deadline.
- [ ] **Enrollment:** Daftar per batch, hitung harga early bird/normal, batasi kuota.
- [ ] **Live Class:** Jadwal 2x/minggu per program, link meeting, rekaman otomatis/upload.
- [ ] **Rekaman:** Arsip rekaman per sesi, akses tanpa batas untuk peserta.
- [ ] **Bank soal:** Minimal 500 soal, dikelompokkan per topik/modul; pembahasan per soal (teks/video).
- [ ] **Latihan terstruktur:** Soal per modul, bisa dikerjakan kapan saja, skor & pembahasan.
- [ ] **Tryout gratis:** Pendaftaran tryout tanpa beli program → kerjakan → ranking → analisis → (opsional) rekomendasi program.
- [ ] **Tryout berbayar:** 2x tryout nasional per batch (OSN-K & Bundle), timer, submit, koreksi.
- [ ] **Dashboard ranking:** Leaderboard nasional per tryout; analisis hasil (skor, breakdown, rekomendasi).
- [ ] **Video pembahasan:** Video per soal/tryout, akses sesuai program.
- [ ] **Forum / grup diskusi:** Per program atau per cohort; bonus bundle termasuk grup diskusi.
- [ ] **Akses 24/7:** Semua materi, rekaman, latihan, bank soal aksesibel kapan saja untuk peserta terdaftar.
- [ ] **Harga & kuota:** Tampilkan early bird vs normal, sisa kuota, tenggat early bird di halaman program dan di LMS.

---

## Contoh User Story untuk Development

- Sebagai **siswa**, saya bisa mendaftar tryout gratis, mengerjakan soal dengan timer, lalu melihat ranking nasional dan analisis hasil (strength/weakness) agar saya bisa memutuskan program mana yang cocok.
- Sebagai **siswa** yang sudah beli program, saya bisa melihat jadwal live class 2x per minggu, join via link, dan menonton rekaman setelahnya kapan saja.
- Sebagai **siswa** program OSN-K atau Bundle, saya bisa ikut 2x tryout nasional per batch dan melihat peringkat saya di dashboard ranking nasional.
- Sebagai **siswa** bundle, saya mendapat akses ke bank soal OSN, rekaman kelas, dan grup diskusi sebagai bonus.
- Sebagai **admin**, saya bisa membuat program, batch, jadwal live, soal tryout, dan mengelola kuota serta harga early bird/normal.

---

## Catatan untuk Backend/API

Jika LMS Anda terpisah dari landing page, pastikan:

- **Program:** API program (mis. `GET /api/v1/packages`) mengembalikan: id, name, slug, short_description, durasi, materi (array), fasilitas (array), bonus (array, untuk bundle), price_early_bird, price_normal, is_bundle, bundle_subtitle, is_open, cta_label, wa_message_template.
- **Tryout:** Endpoint untuk daftar tryout gratis, submit jawaban, ambil ranking, dan analisis hasil.
- **Enrollment:** Endpoint enrollment per batch, cek kuota, hitung harga (early bird/normal).

Dengan prompt ini, Anda bisa memberikan atau mengembangkan fitur LMS yang selaras dengan program dan janji di landing page Fansedu.

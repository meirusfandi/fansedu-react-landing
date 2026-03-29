# Kontrak backend: alur tryout siswa & leaderboard

Dokumen ini merangkum **apa yang diharapkan frontend** setelah penyesuaian alur (daftar → leaderboard → mulai setelah `opensAt`) dan **rekomendasi perubahan di API** agar perilaku konsisten dengan server sebagai sumber kebenaran.

**Spesifikasi API tryout terbaru** (format error, field submit/review, path guru/trainer, leaderboard): [`TRYOUT_API_CONTRACT_BACKEND.md`](./TRYOUT_API_CONTRACT_BACKEND.md).

---

## Ringkas: apakah backend wajib diubah?

| Area | Tanpa ubah backend | Disarankan di backend |
|------|--------------------|------------------------|
| Gate waktu mulai ujian | Frontend menyembunyikan tombol; user bisa memanggil `POST …/start` langsung | **Ya:** tolak `start` sebelum `opensAt` |
| Leaderboard hanya peserta terdaftar | Hanya UX/teks; data tabel bisa tetap “semua user” | **Ya:** filter baris + rank hanya peserta relevan |
| Kartu “Posisi Anda” sebelum daftar | Frontend sembunyikan jika `GET …/status` jelas | **Ya:** rank tidak untuk non-peserta / 404 |
| Field jadwal (`opensAt`) | Jika kosong, frontend anggap “boleh mulai” | **Ya:** selalu kirim ISO valid untuk tryout terjadwal |

---

## 1. Model tryout (list & detail)

**Endpoint contoh:** `GET /api/v1/student/tryouts`, `GET /api/v1/student/tryouts/open`, `GET /api/v1/student/tryouts/:id`, serta varian publik `GET /api/v1/tryouts?status=open` bila dipakai bersamaan.

**Yang harus konsisten:**

1. **`opensAt` (atau setara)** — waktu **ujian boleh dimulai** (bukan hanya “tryout open” di admin).  
   - Frontend memetakan ke `startAt` internal; dipakai oleh `hasTryoutStartTimeArrived`.  
   - **Rekomendasi:** field eksplisit `opensAt` (ISO 8601) di `TryoutResponse`, sama di publik dan siswa.

2. **`closesAt` / `closeAt`** — batas **ikut / mulai** (selaras dengan yang dipakai frontend untuk `isTryoutWindowOpen`).

3. **Opsional tapi berguna:** `registrationDeadlineAt` — batas daftar terpisah dari `closesAt` jika produk membedakan “daftar” vs “ujian”.

**Jika `opensAt` tidak dikirim atau tidak valid:** frontend menganggap waktu mulai sudah tiba (kompatibel data lama). Untuk tryout terjadwal, **backend harus mengirim `opensAt`**.

---

## 2. `GET /api/v1/student/tryouts/:id/status`

Frontend memakai respons ini untuk:

- state **Daftar / Sudah daftar / Sudah attempt**;
- **tombol Daftar** ↔ `canRegister` (prioritas utama bila field ada);
- **tombol Mulai mengerjakan** ↔ `canStartExam` (prioritas utama bila field ada);
- jadwal tampilan: `opensAt`, `closesAt` (override tampilan dari detail tryout bila ada);
- alasan blok mulai: `startDisabledReason` (mis. `not_registered`, `before_opens_at`);
- halaman leaderboard siswa: kartu “Posisi Anda” juga dipengaruhi `GET …/leaderboard/rank` (`inLeaderboard: false`).

**Field yang didukung frontend (camelCase + snake_case opsional):**

| Field | Keterangan |
|--------|------------|
| `isRegistered`, `hasAttempted`, `canRetake`, `attemptCount`, `lastAttemptId` | Seperti sebelumnya |
| `opensAt`, `closesAt` | ISO; dipakai untuk teks jadwal & fallback jendela tutup |
| `tryoutStatus` | Mis. `open` |
| `canRegister` | Menyalakan/mematikan CTA daftar |
| `canStartExam` | Menyalakan/mematikan CTA mulai ujian (sumber utama UI) |
| `startDisabledReason` | Ditampilkan ringkas di UI |

**Jika `canRegister` / `canStartExam` tidak dikirim:** frontend fallback ke logika lama (`closeAt`, `startAt` tryout, `isRegistered`, dll.).

**Jika endpoint ini tidak ada (404):** frontend menganggap status “unknown”; kartu rank bisa tetap mengikuti respons `…/rank` saja. Disarankan endpoint status selalu tersedia untuk siswa yang login.

---

## 3. `POST /api/v1/student/tryouts/:id/start`

Frontend mengaktifkan tombol hanya setelah `opensAt` dan dalam jendela buka; **user tetap bisa memanggil API secara manual**.

**Rekomendasi backend (wajib untuk keamanan alur):**

- **403 atau 400** jika:
  - siswa **belum terdaftar**;
  - **`now < opensAt`**;
  - **`now > closesAt`** (atau aturan “tidak boleh mulai” lain);
  - violation retake (`canRetake` false), dll.

- Body error JSON konsisten (`message` / `error`) agar bisa ditampilkan di UI.

Tanpa ini, gate waktu mulai hanya kosmetik di frontend.

---

## 4. Leaderboard

**Endpoint contoh:** `GET /api/v1/tryouts/:tryoutId/leaderboard` dan `GET /api/v1/tryouts/:tryoutId/leaderboard/rank` (Bearer siswa).

**Ekspektasi produk (selaras dengan copy frontend):**

1. **Baris leaderboard** — idealnya hanya peserta yang **sudah mendaftar** tryout tersebut (boleh skor 0 / belum attempt — tergantung produk).  
   - Hindari menampilkan semua user platform yang belum pernah klik daftar.

2. **`GET …/leaderboard/rank` (posisi user saat ini):**
   - **Kontrak terbaru:** respons **200** dengan `{ "inLeaderboard": false }` (tanpa `rank`/`score`) jika user belum terdaftar atau belum punya entri leaderboard.  
   - Jika peserta punya peringkat/skor: `inLeaderboard: true` (atau field dihilangkan) + `rank` / `score` / `percentile` sesuai kebijakan.

Frontend saat ini:

- jika `inLeaderboard === false` → kartu “Posisi Anda” disembunyikan + banner penjelasan;
- selain itu, kartu mengikuti `isRegistered` / `hasAttempted` dari `…/status` bila rank tidak eksplisit menolak.

---

## 5. Register

`POST /api/v1/student/tryouts/:id/register` — tetap idempoten (201 baru, 200 sudah terdaftar) seperti yang sudah Anda dokumentasikan. Setelah ini, `GET …/status` harus `isRegistered: true` dan entri leaderboard (jika ada) harus konsisten.

---

## 5b. Submit + GET attempt — analisis & skor maks

### Penilaian & `review[]` (kontrak terbaru)

1. **Skor per soal biner** untuk PG / isian **dengan kunci** (`correctOption` / `correctText` terisi di bank soal):  
   - benar → `scoreGot === maxScore`, `isCorrect: true`  
   - salah atau kosong → `scoreGot: 0`, `isCorrect: false`  
   - **Tidak ada skor parsial** (mis. 2,5/5) untuk aturan lama 50% atau sejenisnya.

2. **Tanpa kunci** di soal (kunci kosong):  
   - `scoreGot: 0`, **`isCorrect: null`** (eksplisit di JSON, bukan menghilangkan field) = belum dinilai otomatis, meski siswa sudah mengisi jawaban.

3. **`moduleAnalysis` / `moduleSummary`:** agregat **`correctCount` / `wrongCount` / `unscoredCount`** harus selaras dengan aturan di atas (sama seperti interpretasi `review[]`).

### `POST /api/v1/attempts/:attemptId/submit` (`SubmitResponse`)

| Field JSON | Keterangan |
|------------|------------|
| `maxScore` | Total skor maksimum lembar — **ada di body submit** (number; `0` jika tidak ada di DB). Dipakai menampilkan `X / Y`. |
| `review` | Array per soal: `questionId`, `scoreGot`, `maxScore`, **`isCorrect`: `true` \| `false` \| `null`** (`null` eksplisit jika belum dinilai). Pembahasan, metadata modul, dll. Boleh dibungkus `items` / `outcomes` / `questionReviewOutcomes`. |
| `percentile` | **Opsional.** Hilangkan field dari JSON jika belum bisa dihitung (bukan `0` palsu). Jika ada: angka **0–100** (persentil dalam peserta tryout yang sama; butuh minimal dua skor untuk makna statistik). |
| `moduleAnalysis` | Agregat per modul (`totalCount`, `correctCount`, `wrongCount`, `unscoredCount` + sinonim snake_case). |
| `moduleSummary` | **Isi sama dengan `moduleAnalysis`** (alias kompatibilitas); FE membaca keduanya. |

### `GET /api/v1/student/attempts/{attemptId}` (siswa, setelah submitted)

Untuk attempt berstatus **submitted**, respons dapat berisi **`review`**, **`moduleAnalysis`**, **`moduleSummary`** (dihitung ulang di server, DTO sama dengan submit) agar **refresh halaman** atau buka **`#/student/tryout/attempts/:id`** tetap mendapat analisis tanpa menyimpan body submit di klien.

**Lembar ujian siswa (`QuestionResponse`):** `moduleId`, `moduleTitle`, `bidang`, `tags` — **tanpa** `correctOption` / `correctText`.

### Persentil — perilaku frontend

- Tipe di klien: `percentile?: number` (field boleh absen).  
- Parser mengabaikan `percentile: null` atau string kosong.  
- Jika field **tidak ada**: UI menampilkan copy **“Persentil belum tersedia”** (bukan 0%).  
- Jika `percentile === 0` **dan** skor total **&gt; 0**: UI menganggap placeholder lama dan menampilkan penjelasan serupa (bukan “Anda dapat 0%”).  
- Jika `percentile === 0` dan skor 0: boleh ditampilkan 0% sebagai peringkat terendah yang sah.

### Perilaku frontend (ringkas)

- Setelah submit: tetap **GET** `/student/attempts/:attemptId`; prioritas **`review` + `moduleAnalysis` / `moduleSummary`** dari GET; lalu isi submit; lalu endpoint review/breakdown.  
- Tampilan per soal mengikuti kontrak: **`isCorrect === null` + `scoreGot === 0`** → **“Belum dinilai otomatis”** (bukan salah); penilaian biner dengan kunci → **0 atau penuh** saja.  
- Fallback agregat modul lokal hanya jika tabel server tidak informatif tetapi `review` punya skor.

---

## 5c. Email transaksi (checkout, dll.)

**Bukan perubahan kontrak API untuk FE.** Jika di server `BREVO_SMTP_KEY` atau `SMTP_PASSWORD` (+ konfigurasi SMTP/from) terisi, email benar-benar dikirim; jika tidak, cukup log (dev). Variabel env ini untuk **deploy backend**, bukan untuk app frontend.

---

## 6. Ringkasan checklist implementasi backend

- [ ] `TryoutResponse` memuat **`opensAt`** (dan `closesAt`) konsisten di list/detail siswa & publik.  
- [ ] **`POST …/start`** menolak sebelum `opensAt` / setelah tutup / belum register.  
- [ ] **`GET …/status`** akurat untuk `isRegistered` / `hasAttempted` (dan tetap hidup untuk siswa login).  
- [ ] **Leaderboard list** hanya (atau utamakan) peserta terdaftar.  
- [ ] **`…/leaderboard/rank`** tidak mengexpose posisi “palsu” untuk user yang belum daftar.  
- [ ] **Submit + GET attempt:** skor per soal biner dengan kunci; tanpa kunci → `isCorrect: null` eksplisit; **`percentile`** opsional tanpa placeholder 0; **`moduleSummary`** = **`moduleAnalysis`**.  
- [ ] **`GET /student/tryouts/history`:** kirim **`attemptId`** per baris untuk tautan detail hasil.  
- [ ] Dokumentasi error untuk `start` / `register` (kode + pesan) untuk UX.

---

## 7. Referensi frontend

- Gate waktu mulai: `src/utils/tryoutStudent.ts` — `hasTryoutStartTimeArrived` (memakai `startAt` dari parse `opensAt`/setara).  
- Alur tombol & copy: `src/pages/lms/StudentTryoutDetailPage.tsx`.  
- Leaderboard + status: `src/pages/lms/TryoutLeaderboardPage.tsx`.  
- Parsing field tryout: `src/lib/api.ts` — `parseOpenTryoutsResponse` / `OpenTryoutItem`.  
- Submit + `review` / `moduleAnalysis` / `moduleSummary` / `maxScore` / `percentile` opsional: `parseTryoutSubmitResultPayload`, `pickEmbeddedReviewFromSubmit`, `pickEmbeddedModuleAnalysisFromSubmit` di `src/lib/api.ts`; **GET attempt**: `getStudentAttemptDetail`. Agregat fallback: `src/utils/tryoutModuleAnalysis.ts`.  
- Penilaian tampilan per soal: `src/utils/tryoutReviewGrading.ts` (`effectiveTryoutQuestionCorrect`, `resolveTryoutReviewDisplay`).  
- UI hasil: `src/components/lms/TryoutAttemptResultView.tsx`; dipakai oleh `StudentTryoutExamPage` (submitted + hydrasi GET attempt) dan **`#/student/tryout/attempts/:attemptId`** (`StudentTryoutAttemptReviewPage`).
- Riwayat: `GET /student/tryouts/history` harus mengirim **`attemptId`** per baris agar tautan “Detail hasil” memuat pembahasan attempt yang benar.

Setelah backend memenuhi poin di atas, perilaku server dan UI akan selaras tanpa mengandalkan “kebaikan” user saja.

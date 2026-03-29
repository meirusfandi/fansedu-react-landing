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

### `POST /api/v1/attempts/:attemptId/submit` (`SubmitResponse`)

| Field JSON | Keterangan |
|------------|------------|
| `maxScore` | **Wajib dianggap ada** oleh FE (number). Gunakan `0` jika tidak ada di DB. Dipakai menampilkan skor sebagai `X / Y`. |
| `review` | Daftar outcome per soal: `questionId`, `isCorrect` (boolean atau **`null`** jika belum bisa dinilai — field tetap dikirim eksplisit), teks pembahasan, metadata modul bila ada. Boleh array langsung atau dibungkus `items` / `outcomes` / `questionReviewOutcomes`. |
| `moduleAnalysis` | Agregat per modul (`ModuleAnalysisAgg`): `moduleId`, `moduleTitle` / `bidang`, `totalCount`, `correctCount`, `wrongCount`, `unscoredCount` (dan sinonim snake_case yang dipetakan di klien). |
| `moduleSummary` | **Duplikat isi `moduleAnalysis`** (kompatibilitas nama); FE membaca keduanya. |

### `GET /api/v1/student/attempts/{attemptId}` (setelah submitted)

Respons **AttemptResponse** dapat memuat field yang sama: `review`, `moduleAnalysis`, `moduleSummary` (salinan `moduleAnalysis`), dihitung ulang lewat **TryoutAnalysisForAttempt** (sama seperti saat submit). FE memanggil GET ini setelah submit agar **refresh halaman** tetap mendapat pembahasan dan tabel modul tanpa menyimpan body submit di klien.

**Lembar ujian siswa (`QuestionResponse`):** `moduleId`, `moduleTitle`, `bidang`, `tags` — **tanpa** `correctOption` / `correctText`.

**Perilaku frontend:**

- Setelah `submitted`, memanggil `GET /student/attempts/:attemptId` dan memprioritaskan `review` + `moduleAnalysis` dari situ untuk UI; fallback: isi dari respons submit, lalu `GET …/attempts/:id/review` / breakdown.
- Tabel modul: prioritas agregat dari GET attempt, lalu dari submit, lalu hitung ulang lokal dari soal + baris review.
- `isCorrect: null` ditampilkan sebagai “Belum dinilai” (bukan benar/salah).

---

## 6. Ringkasan checklist implementasi backend

- [ ] `TryoutResponse` memuat **`opensAt`** (dan `closesAt`) konsisten di list/detail siswa & publik.  
- [ ] **`POST …/start`** menolak sebelum `opensAt` / setelah tutup / belum register.  
- [ ] **`GET …/status`** akurat untuk `isRegistered` / `hasAttempted` (dan tetap hidup untuk siswa login).  
- [ ] **Leaderboard list** hanya (atau utamakan) peserta terdaftar.  
- [ ] **`…/leaderboard/rank`** tidak mengexpose posisi “palsu” untuk user yang belum daftar.  
- [ ] Dokumentasi error untuk `start` / `register` (kode + pesan) untuk UX.

---

## 7. Referensi frontend

- Gate waktu mulai: `src/utils/tryoutStudent.ts` — `hasTryoutStartTimeArrived` (memakai `startAt` dari parse `opensAt`/setara).  
- Alur tombol & copy: `src/pages/lms/StudentTryoutDetailPage.tsx`.  
- Leaderboard + status: `src/pages/lms/TryoutLeaderboardPage.tsx`.  
- Parsing field tryout: `src/lib/api.ts` — `parseOpenTryoutsResponse` / `OpenTryoutItem`.  
- Submit + `review` / `moduleAnalysis` / `maxScore`: `parseTryoutSubmitResultPayload`, `pickEmbeddedReviewFromSubmit`, `pickEmbeddedModuleAnalysisFromSubmit` di `src/lib/api.ts`; **GET attempt**: `getStudentAttemptDetail` mem-parsing embed yang sama. Agregat fallback: `src/utils/tryoutModuleAnalysis.ts`.  
- UI hasil: `src/pages/lms/StudentTryoutExamPage.tsx` (fase `submitted` — hydrasi dari GET attempt).

Setelah backend memenuhi poin di atas, perilaku server dan UI akan selaras tanpa mengandalkan “kebaikan” user saja.

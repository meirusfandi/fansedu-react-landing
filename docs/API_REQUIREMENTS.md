# Kebutuhan API LMS (Backend)

Dokumen ini mendeskripsikan endpoint dan payload yang dibutuhkan frontend LMS. Backend dapat diimplementasikan terpisah; sesuaikan base URL via `VITE_API_URL` (project ini Vite, bukan Next.js).

**Lihat juga:**
- **docs/API_SPEC.md** — Spesifikasi terstruktur per flow (katalog, detail product, packages, checkout, auth, student, instructor).
- **docs/openapi.yaml** — OpenAPI 3.0 untuk generate client/server (Swagger, codegen).
- **docs/API_CURL_EXAMPLES.md** — Contoh curl siap pakai.
- **docs/GEO_REDIS_BACKEND.md** — Cache provinsi/kab-kota di Redis (backend).
- **docs/REDIS_CACHE_FRONTEND.md** — Panduan Flutter/web: tidak konek Redis dari klien; endpoint ter-cache; leaderboard polling; env Redis hanya server.

---

## Base URL

- Development: `http://localhost:8080/api/v1` (sama dengan `VITE_API_URL` di frontend)
- Header: `Content-Type: application/json`
- Auth: gunakan **Bearer token** atau **session cookie** setelah login (sesuai kesepakatan backend)
- Semua endpoint di bawah base: `/auth/*`, `/programs`, `/packages`, `/checkout/*`, `/student/*`, `/instructor/*`

---

## 1. Auth

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/auth/register` | Daftar akun (siswa/guru). Juga dipanggil saat guest checkout inline register. Tanpa email verifikasi, akun langsung aktif. Jika email sudah ada: upsert (update password & name, return token). |
| POST | `/auth/login` | Login, kembalikan token/session. |
| POST | `/auth/set-password` | Set password pertama kali (hanya jika via complete-purchase-auth fallback) |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Data user saat ini (untuk header & guard) |

### Request/Response

**POST /auth/register**
```json
// Request
{ "name": "string", "email": "string", "password": "string", "role": "student" | "instructor" }

// Response 201 (baru maupun upsert) — akun langsung aktif, JANGAN kirim email verifikasi
{
  "user": { "id": "uuid", "name": "string", "email": "string", "role": "student" | "instructor", "mustSetPassword": false },
  "token": "string"
}
```
- Dipakai saat registrasi biasa **dan** saat guest checkout inline register.
- **Upsert behavior:** Jika email sudah ada, backend:
  1. Hash password baru dari request.
  2. Update `PasswordHash`, `Name` (jika ada di body).
  3. Set `EmailVerified = true`, `MustSetPassword = false`.
  4. Simpan user (tanpa membuat user baru).
  5. Generate JWT token dan return seperti register biasa (201).
- Tidak ada lagi response 409. Frontend **tidak perlu fallback** ke `/auth/login`.
- Jangan kirim email verifikasi; akun langsung aktif.

**POST /auth/login**
```json
// Request
{ "email": "string", "password": "string" }

// Response 200
{
  "user": { "id": "uuid", "name": "string", "email": "string", "role": "student" | "instructor", "mustSetPassword": true | false },
  "token": "string"
}
```

**GET /auth/me**
```json
// Response 200
{ "id": "uuid", "name": "string", "email": "string", "role": "student" | "instructor", "mustSetPassword": true | false }
```

**POST /auth/set-password**
```json
// Request
{ "newPassword": "string (min 6)" }

// Response 200
{ "message": "Password berhasil di-set", "mustSetPassword": false }
```

---

## 2. Program (Katalog & Detail)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/programs` | Daftar program (filter, search, pagination) |
| GET | `/programs/:slug` | Detail program by slug (termasuk modules, reviews, rating) |

### Query params GET /programs

- `category` (optional): filter kategori
- `search` (optional): cari di judul/deskripsi
- `page` (optional, default 1)
- `limit` (optional, default 12)

### Response GET /programs

```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "string",
      "title": "string",
      "shortDescription": "string",
      "thumbnail": "string",
      "price": 249000,
      "priceDisplay": "Rp249.000",
      "instructor": { "id": "uuid", "name": "string", "avatar": "string" },
      "category": "string",
      "level": "beginner | intermediate | advanced",
      "duration": "string",
      "rating": 4.9,
      "reviewCount": 128
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 9
}
```

### Response GET /programs/:slug

```json
{
  "id": "uuid",
  "slug": "string",
  "title": "string",
  "shortDescription": "string",
  "description": "string",
  "thumbnail": "string",
  "price": 249000,
  "priceDisplay": "Rp249.000",
  "instructor": { "id": "uuid", "name": "string", "avatar": "string" },
  "category": "string",
  "level": "beginner | intermediate | advanced",
  "duration": "string",
  "rating": 4.9,
  "reviewCount": 128,
  "modules": [
    {
      "id": "uuid",
      "title": "string",
      "lessons": [
        { "id": "uuid", "title": "string", "duration": "string" }
      ]
    }
  ],
  "reviews": [
    { "id": "uuid", "user": "string", "rating": 5, "comment": "string", "date": "string" }
  ]
}
```

---

## 3. Checkout & Payment

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/checkout/initiate` | Buat order & dapat checkout_id |
| POST | `/checkout/payment-session` | Buat sesi pembayaran (VA/bank/ewallet), dapat URL redirect ke gateway |

### Flow

1. User isi nama & email di checkout → frontend panggil **POST /checkout/initiate** dengan `programId` (atau `programSlug`), `name`, `email`.
2. Backend buat order (status pending), kembalikan `checkoutId` (order_id).
3. User pilih metode pembayaran + isi promo (opsional) → frontend panggil **POST /checkout/payment-session** dengan `checkoutId`, `paymentMethod`, `promoCode` (opsional).
4. Backend validasi promo, hit gateway (Midtrans/Xendit/dll.), kembalikan `paymentUrl` dan/atau `virtualAccountNumber`, `expiry`, dll.
5. Frontend redirect user ke `paymentUrl` (atau tampilkan VA).
6. Setelah bayar, gateway callback backend → backend update order + enrollment.
7. User di-redirect ke `#/checkout/success` (redirect_url dari gateway).

### Flow Baru: Guest Checkout — Register Inline + Set Password Sebelum Upload Bukti

Tujuan:
- Jika pembeli belum punya akun, proses checkout/pembayaran tetap berjalan sebagai guest.
- **Setelah klik "Bayar & Daftar Program"** (payment-session sukses), frontend meminta user untuk **atur password** dan langsung mendaftarkan akun via `POST /auth/register`.
- Setelah register sukses, frontend auto-login (simpan token) lalu baru masuk ke halaman upload bukti transfer.
- Berlaku untuk akun **student** maupun **instructor**.

Urutan flow (guest checkout):
1. Guest isi nama & email → `POST /checkout/initiate` (tanpa Bearer).
2. Pilih metode bayar → `POST /checkout/payment-session`.
3. **Frontend tampilkan form "Atur Password Akun"** (nama & email readonly, user isi password + konfirmasi).
4. Frontend panggil `POST /auth/register` dengan nama, email, password, role dari checkout.
5. Backend buat akun baru **atau upsert** jika email sudah ada (update password + name, set `EmailVerified=true`, `MustSetPassword=false`).
6. Backend kembalikan `{ user, token }` (selalu 201). Frontend simpan token (auto login).
7. Baru masuk halaman instruksi transfer + upload bukti pembayaran.
8. Jika user sudah login saat klik bayar, step 3–6 di-skip (langsung ke step 7).

**Aturan backend `POST /auth/register` (upsert):**
- Jika email belum ada → buat akun baru.
- Jika email sudah ada → hash password baru, update `PasswordHash`, `Name`, set `EmailVerified=true`, `MustSetPassword=false`, simpan user. Return 201 + token seperti biasa.
- Tidak ada response 409. Frontend selalu pakai `POST /auth/register` tanpa fallback.
- Jangan kirim email verifikasi; akun langsung aktif.
- Return `user` + `token` langsung.
- Field `mustSetPassword` pada response = `false` (password sudah di-set saat register).
- Berlaku untuk role `student` dan `instructor`.

### Request/Response

**POST /checkout/initiate**
```json
// Request — frontend kirim expectedTotal (harga dari packages) agar order total tidak 0
{ "programSlug": "string", "name": "string", "email": "string", "userId": "uuid-opsional", "expectedTotal": 349000, "normalPrice": 500000 }

// Response 201 (atau 200 bila mengembalikan order yang sudah ada)
{ "checkoutId": "uuid", "orderId": "uuid", "total": 249000, "program": { "title": "string", "priceDisplay": "string" } }
```
- **Wajib backend:** (1) Sebelum buat order baru, cek apakah sudah ada order pending untuk user+program yang sama; jika ada kembalikan order itu. (2) Saat buat order baru (atau mengembalikan order), set **total** dari **expectedTotal** request jika ada (frontend kirim harga dari packages), agar response total tidak 0.

**POST /checkout/payment-session**
```json
// Request — frontend mengirim amount & uniqueCode saat user masuk halaman transfer
{
  "checkoutId": "uuid",
  "paymentMethod": "bank_transfer",
  "promoCode": "string (optional)",
  "uniqueCode": 456,
  "amount": 349456
}
```
- **Backend wajib:** Simpan `amount` dan `uniqueCode` ke record order/transaksi yang terkait `checkoutId`. Update kolom total/amount agar tidak 0; GET /student/transactions harus mengembalikan nominal ini.

```json
// Response 200
{
  "paymentUrl": "https://...",
  "orderId": "uuid",
  "expiry": "2026-02-27T12:00:00Z",
  "virtualAccountNumber": "optional",
  "amount": 349456
}
```

**POST /checkout/orders/:orderId/complete-purchase-auth** (opsional / fallback)

> **Catatan:** Flow utama sekarang menggunakan `POST /auth/register` inline saat checkout (step 3–6 di atas). Endpoint ini tetap tersedia sebagai fallback jika diperlukan (mis. callback dari payment gateway yang perlu auto-create akun di sisi backend).

```json
// Request
{ "source": "payment_success", "roleHint": "student | instructor (opsional)" }

// Response 200
{
  "orderId": "uuid",
  "auth": {
    "token": "jwt-token",
    "user": { "id": "uuid", "name": "Budi", "email": "budi@example.com", "role": "student" },
    "mustSetPassword": true,
    "nextAction": "SET_PASSWORD"
  }
}
```
- Endpoint ini idempotent: jika user sudah ada, tetap return token + status `mustSetPassword`.
- Jika purchase belum valid, return 409.
- Jika `roleHint` tidak dikirim, backend tentukan role dari metadata checkout/order.

---

## 4. Student Dashboard

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/student/dashboard` | Ringkasan dashboard (stats, recent courses) |
| GET | `/student/courses` | Daftar program yang di-enroll (dengan progress) |
| GET | `/student/transactions` | Riwayat transaksi/pembayaran |
| GET | `/student/certificates` | Daftar sertifikat |
| GET | `/student/profile` | Profil siswa (atau pakai /auth/me) |
| PUT | `/student/profile` | Update profil |

### Gate Password Setup (wajib)

Jika token milik user dengan `mustSetPassword=true`, endpoint berikut harus return **403**:
- `/student/dashboard`
- `/student/courses`
- `/student/transactions`
- `/student/certificates`
- `/instructor/courses`
- `/instructor/students`
- `/instructor/earnings`
- endpoint protected lain selain endpoint auth yang diizinkan

Contoh error:
```json
{
  "error": "password_setup_required",
  "message": "Silakan set password terlebih dahulu sebelum mengakses dashboard."
}
```

Endpoint yang tetap boleh diakses saat `mustSetPassword=true`:
- `GET /auth/me`
- `POST /auth/set-password`
- `POST /auth/logout`

### Response GET /student/courses

```json
{
  "data": [
    {
      "id": "uuid",
      "program": { "id": "uuid", "slug": "string", "title": "string", "thumbnail": "string" },
      "progressPercent": 65,
      "enrolledAt": "ISO8601",
      "lastAccessedAt": "ISO8601"
    }
  ]
}
```

### Response GET /student/transactions

```json
{
  "data": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "status": "paid",
      "total": 249000,
      "programs": [{ "title": "string" }],
      "paidAt": "ISO8601"
    }
  ]
}
```

**Kenapa GET /student/transactions masih mengembalikan total 0 (meskipun initiate & payment-session sudah benar)?**

Pastikan hal berikut di backend:

1. **Sumber nilai `total` di response**  
   Endpoint ini harus mengembalikan **total dari kolom yang sama** yang diisi oleh:
   - **POST /checkout/initiate** (dari `expectedTotal` → simpan ke kolom order, mis. `lms_orders.total`), atau
   - **POST /checkout/payment-session** (dari `amount` → update order/transaksi yang terkait `checkoutId`).  
   Jika GET /student/transactions baca dari tabel/kolom lain (mis. hanya dari `lms_payments.amount` yang belum diisi, atau dari view lama), nilai akan tetap 0.

2. **Update order saat payment-session**  
   Saat memproses payment-session, backend harus **update record order** yang punya `id = checkoutId` (atau order_id yang sama) dengan **`total = amount`** (dan simpan `unique_code` jika ada). GET /student/transactions harus memakai **order.total** (atau payment.amount yang sudah di-set dari request) sebagai sumber untuk field `total` di setiap item.

3. **Query / join yang salah**  
   Jika response di-build dari join (order + payment + program), pastikan **SELECT** memakai kolom yang sudah di-update (mis. `orders.total` atau `COALESCE(payments.amount, orders.total)`), bukan kolom yang tidak pernah di-set (mis. `orders.subtotal` saja) atau default 0.

4. **Urutan penyimpanan**  
   Initiate menulis **expectedTotal** ke order; payment-session menulis **amount** ke order/payment. Pastikan GET /student/transactions membaca dari tabel/kolom yang memang di-update oleh kedua flow tersebut (biasanya **order.total** atau **payment.amount**), bukan dari kolom lain yang tetap 0.

**Rekomendasi:** Satu sumber kebenaran untuk “jumlah transaksi” (mis. `lms_orders.total`). Saat initiate → set `lms_orders.total = expectedTotal`. Saat payment-session → set `lms_orders.total = amount` (bisa overwrite). GET /student/transactions → kembalikan `total` dari `lms_orders.total` (atau dari payment yang sudah di-set amount-nya).

---

## 5. Instructor Dashboard

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/instructor/courses` | Daftar program yang diajar |
| GET | `/instructor/students` | Daftar siswa (enrollment per program) |
| GET | `/instructor/earnings` | Ringkasan pendapatan (per bulan/periode) |

### Response GET /instructor/students

```json
{
  "data": [
    { "userId": "uuid", "name": "string", "email": "string", "programTitle": "string", "progressPercent": 65 }
  ]
}
```

### Response GET /instructor/earnings

```json
{
  "data": [
    { "period": "2026-02", "revenue": 12500000, "newStudents": 42 }
  ]
}
```

---

## 6. Landing Page — Paket (Packages)

Section **Program yang Sedang Dibuka** di landing page mengambil data dari endpoint terpisah (bisa backend yang sama, path berbeda).

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/packages` | Daftar paket yang sedang dibuka (untuk kartu program di landing) |

**Catatan:** URL penuh = `{VITE_API_URL}/packages`. Contoh: `VITE_API_URL=http://localhost:8080/api/v1` → request ke `http://localhost:8080/api/v1/packages`. Lihat juga **docs/API_CURL_EXAMPLES.md**.

### Response GET /packages

Array of object (atau object dengan property `data` berisi array). Field **snake_case** (frontend akan map ke camelCase):

```json
[
  {
    "id": "uuid",
    "name": "string",
    "slug": "string",
    "short_description": "string | null",
    "price_display": "string | null",
    "price_early_bird": "string | null",
    "price_normal": "string | null",
    "cta_label": "string",
    "wa_message_template": "string | null",
    "cta_url": "string | null",
    "is_open": true,
    "is_bundle": false,
    "bundle_subtitle": "string | null",
    "durasi": "string | null",
    "materi": ["string"] | "[\"a\",\"b\"]",
    "fasilitas": ["string"] | "[\"a\",\"b\"]",
    "bonus": ["string"] | "[\"a\"]"
  }
]
```

- `materi`, `fasilitas`, `bonus`: array atau JSON string array.
- Jika `is_open === false`, frontend menyembunyikan paket.
- Jika `wa_message_template` ada, frontend membangun link WA dengan template tersebut; jika tidak, bisa pakai `cta_url` atau tombol "Lihat Detail" ke `#/program/:slug`.

Schema tabel `packages` ada di **`database/landing_schema.sql`**.

---

## 7. Analytics (Visitor Tracking)

Tracking pengunjung landing page. Frontend mengirim pageview secara otomatis saat halaman dimuat. Admin bisa melihat data dari dashboard.

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/analytics/pageview` | Tidak | Catat satu kunjungan halaman (dipanggil frontend otomatis) |
| GET | `/admin/analytics/summary` | Bearer (admin) | Ringkasan statistik: total visitor, unique visitor, per hari/minggu/bulan |
| GET | `/admin/analytics/visitors` | Bearer (admin) | Daftar detail kunjungan individual (pagination) |

### POST /analytics/pageview

Frontend memanggil endpoint ini sekali saat landing page dimuat (fire-and-forget, tidak blocking UI).

```json
// Request
{
  "page": "/",
  "referrer": "https://google.com/...",
  "screenWidth": 1920,
  "screenHeight": 1080,
  "timezone": "Asia/Jakarta",
  "language": "id-ID"
}
```

```json
// Response 201
{ "ok": true }
```

**Aturan backend:**
- Simpan data ke tabel `analytics_pageviews` (lihat schema di bawah).
- Ambil `IP address` dari request header (`X-Forwarded-For` / `X-Real-Ip` / remote addr).
- Ambil `User-Agent` dari request header.
- Generate `session_id` dari hash IP + User-Agent + tanggal (supaya unique per device per hari), atau pakai cookie/fingerprint jika mau lebih akurat.
- Endpoint ini **tidak butuh auth** dan harus sangat ringan (async insert, return 201 segera).
- Rate limit: maks 1 record per session_id per halaman per 5 menit (hindari duplikasi dari refresh berulang).

### GET /admin/analytics/summary

```json
// Query params
?startDate=2026-03-01&endDate=2026-03-15&groupBy=day

// Response 200
{
  "totalPageviews": 1250,
  "uniqueVisitors": 830,
  "data": [
    { "date": "2026-03-01", "pageviews": 95, "uniqueVisitors": 72 },
    { "date": "2026-03-02", "pageviews": 110, "uniqueVisitors": 85 }
  ]
}
```

| Parameter | Tipe | Wajib | Default | Keterangan |
|-----------|------|-------|---------|------------|
| startDate | string (YYYY-MM-DD) | Tidak | 30 hari lalu | Mulai periode |
| endDate | string (YYYY-MM-DD) | Tidak | hari ini | Akhir periode |
| groupBy | string | Tidak | day | `day` / `week` / `month` |

### GET /admin/analytics/visitors

```json
// Query params
?page=1&limit=50&startDate=2026-03-01&endDate=2026-03-15

// Response 200
{
  "data": [
    {
      "id": "uuid",
      "sessionId": "hash-string",
      "page": "/",
      "ipAddress": "103.x.x.x",
      "userAgent": "Mozilla/5.0...",
      "referrer": "https://google.com/...",
      "screenWidth": 1920,
      "screenHeight": 1080,
      "timezone": "Asia/Jakarta",
      "language": "id-ID",
      "visitedAt": "2026-03-15T10:30:00Z"
    }
  ],
  "total": 1250,
  "page": 1,
  "totalPages": 25
}
```

### Schema tabel (rekomendasi)

```sql
CREATE TABLE analytics_pageviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  VARCHAR(128) NOT NULL,
  page        VARCHAR(512) NOT NULL DEFAULT '/',
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  referrer    TEXT,
  screen_width  INT,
  screen_height INT,
  timezone    VARCHAR(64),
  language    VARCHAR(16),
  visited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pageviews_visited_at ON analytics_pageviews(visited_at);
CREATE INDEX idx_pageviews_session_id ON analytics_pageviews(session_id);
CREATE INDEX idx_pageviews_page ON analytics_pageviews(page);
```

---

## Geo / Wilayah Indonesia (cache Redis di backend)

Untuk dropdown **Provinsi** dan **Kabupaten/Kota** di form (mis. profil instruktur), frontend **tidak bisa** menyimpan ke Redis — **Redis hanya di server**. Backend disarankan mengekspos endpoint yang membaca/menulis cache Redis, lalu frontend memakai URL internal (bukan memanggil API publik setiap kali).

| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| GET | `/geo/provinces` | Tidak | Daftar provinsi (`[{ "id", "name" }]`, sama format emsifa) |
| GET | `/geo/regencies/:provinceId` | Tidak | Kab/kota untuk `provinceId` (BPS) |

**Alur backend (disarankan):**

1. `GET` request masuk → cek Redis key mis. `fansedu:geo:provinces:v1` / `fansedu:geo:regencies:v1:{provinceId}`.
2. **Hit** → kembalikan JSON dari Redis.
3. **Miss** → fetch dari sumber (HTTP ke `https://www.emsifa.com/api-wilayah-indonesia/...` atau file statis), **SET** Redis dengan TTL panjang (mis. **30 hari**), lalu response.

Detail key, TTL, dan contoh pseudo-code: **`docs/GEO_REDIS_BACKEND.md`**.

**Frontend:** set `VITE_GEO_SOURCE=internal` agar memanggil `{VITE_API_URL}/geo/provinces` dan `{VITE_API_URL}/geo/regencies/:id`. Tanpa env tersebut, frontend memakai API publik emsifa dengan **cache `localStorage` 7 hari** di sisi browser (bukan Redis).

---

## 8. Error Response

Gunakan HTTP status code standar. Body konsisten:

```json
{ "error": "kode_error", "message": "Pesan untuk user" }
```

Contoh: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `422 Validation Error`.

---

## Ringkasan Flow UI → API

| Langkah UI | Panggilan API |
|------------|----------------|
| Landing / Katalog | GET /programs (optional) |
| Klik kartu program | GET /programs/:slug (optional, bisa static/SSR) |
| Klik "Daftar Program" | Navigate ke #/checkout?program=:slug |
| Isi nama & email, Lanjutkan | POST /checkout/initiate |
| Pilih metode, isi promo, Bayar | POST /checkout/payment-session |
| **(Guest) Atur password** | **POST /auth/register** (upsert: buat akun baru atau update existing, auto-login, lalu lanjut ke instruksi transfer) |
| Upload bukti transfer | POST /checkout/orders/:orderId/payment-proof |
| Success page, "Mulai Belajar" | GET /student/courses (setelah login) |
| Landing — section Program | GET /packages (optional; fallback mock) |
| **Landing page load** | **POST /analytics/pageview** (fire-and-forget, tracking visitor) |
| **Admin: lihat statistik** | **GET /admin/analytics/summary** (Bearer admin) |
| **Admin: detail visitor** | **GET /admin/analytics/visitors** (Bearer admin) |
| **Wilayah (opsional, Redis)** | **GET /geo/provinces**, **GET /geo/regencies/:provinceId** | Tanpa auth; cache Redis di backend |

Schema database untuk mendukung API ini ada di **`database/lms_schema.sql`** (LMS) dan **`database/landing_schema.sql`** (packages, site settings).

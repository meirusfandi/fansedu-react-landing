# Kebutuhan API LMS (Backend)

Dokumen ini mendeskripsikan endpoint dan payload yang dibutuhkan frontend LMS. Backend dapat diimplementasikan terpisah; sesuaikan base URL via `VITE_API_URL` (project ini Vite, bukan Next.js).

**Lihat juga:**
- **docs/API_SPEC.md** — Spesifikasi terstruktur per flow (katalog, detail product, packages, checkout, auth, student, instructor).
- **docs/openapi.yaml** — OpenAPI 3.0 untuk generate client/server (Swagger, codegen).
- **docs/API_CURL_EXAMPLES.md** — Contoh curl siap pakai.

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
| POST | `/auth/register` | Daftar akun (siswa/guru) |
| POST | `/auth/login` | Login, kembalikan token/session |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Data user saat ini (untuk header & guard) |

### Request/Response

**POST /auth/register**
```json
// Request
{ "name": "string", "email": "string", "password": "string", "role": "student" | "instructor" }

// Response 201
{ "user": { "id": "uuid", "name": "string", "email": "string", "role": "student" | "instructor" }, "token": "string" }
```

**POST /auth/login**
```json
// Request
{ "email": "string", "password": "string" }

// Response 200
{ "user": { "id", "name", "email", "role" }, "token": "string" }
```

**GET /auth/me**
```json
// Response 200
{ "id": "uuid", "name": "string", "email": "string", "role": "student" | "instructor" }
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

## 7. Error Response

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
| Redirect ke gateway | Backend terima callback, update order + enrollment |
| Success page, "Mulai Belajar" | GET /student/courses (setelah login) |
| Landing — section Program | GET /packages (optional; fallback mock) |

Schema database untuk mendukung API ini ada di **`database/lms_schema.sql`** (LMS) dan **`database/landing_schema.sql`** (packages, site settings).

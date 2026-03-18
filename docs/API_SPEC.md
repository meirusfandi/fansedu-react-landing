# Spesifikasi API — Katalog, Detail Product, Packages, Checkout

Base URL: `{VITE_API_URL}` = `http://localhost:8080/api/v1`  
Header: `Content-Type: application/json`. Auth: `Authorization: Bearer <token>`.

---

## Daftar Isi

1. [Katalog (Daftar Program)](#1-katalog-daftar-program)
2. [Detail Product (Detail Program)](#2-detail-product-detail-program)
3. [Packages (Landing — Program yang Dibuka)](#3-packages-landing--program-yang-dibuka)
4. [Flow Checkout](#4-flow-checkout)
5. [Auth](#5-auth)
6. [Student & Instructor](#6-student--instructor)
7. [Error Response](#7-error-response)

---

## 1. Katalog (Daftar Program)

**GET /programs** — Daftar program untuk halaman Katalog (#/catalog). Mendukung filter, search, dan pagination.

| Method | Endpoint     | Auth |
|--------|--------------|------|
| GET    | `/programs`  | Opsional (Bearer jika ada) |

### Query Parameters

| Parameter  | Tipe   | Wajib | Default | Keterangan                    |
|-----------|--------|-------|---------|-------------------------------|
| category  | string | Tidak | -       | Filter kategori               |
| search    | string | Tidak | -       | Cari di judul/deskripsi       |
| page      | number | Tidak | 1       | Halaman                       |
| limit     | number | Tidak | 12      | Jumlah per halaman            |

### Contoh Request

```http
GET /programs?page=1&limit=12
GET /programs?page=1&limit=12&search=OSN
GET /programs?category=Programming
```

### Response 200

```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "pelatihan-intensif-osn-k-2026",
      "title": "Pelatihan Intensif OSN-K 2026 Informatika",
      "shortDescription": "Program pelatihan khusus untuk membantu siswa mempersiapkan seleksi OSN.",
      "thumbnail": "https://...",
      "price": 349000,
      "priceDisplay": "Rp349.000",
      "instructor": { "id": "uuid", "name": "Nama Guru", "avatar": "https://..." },
      "category": "OSN",
      "level": "intermediate",
      "duration": "4 Minggu",
      "rating": 4.9,
      "reviewCount": 128
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 9
}
```

---

## 2. Detail Product (Detail Program)

**GET /programs/:slug** — Detail satu program (halaman #/program/:slug). Termasuk modul, lessons, dan reviews.

| Method | Endpoint          | Auth |
|--------|-------------------|------|
| GET    | `/programs/:slug` | Opsional |

### Path Parameters

| Parameter | Tipe   | Keterangan     |
|-----------|--------|----------------|
| slug      | string | Slug unik program (URL-safe) |

### Response 200

```json
{
  "id": "uuid",
  "slug": "pelatihan-intensif-osn-k-2026",
  "title": "Pelatihan Intensif OSN-K 2026 Informatika",
  "shortDescription": "Program pelatihan khusus...",
  "description": "Deskripsi lengkap HTML atau plain text...",
  "thumbnail": "https://...",
  "price": 349000,
  "priceDisplay": "Rp349.000",
  "instructor": { "id": "uuid", "name": "Nama Guru", "avatar": "https://..." },
  "category": "OSN",
  "level": "intermediate",
  "duration": "4 Minggu",
  "rating": 4.9,
  "reviewCount": 128,
  "modules": [
    {
      "id": "uuid",
      "title": "Modul 1: Dasar Algoritma",
      "lessons": [
        { "id": "uuid", "title": "Pengenalan C++", "duration": "15 min" }
      ]
    }
  ],
  "reviews": [
    { "id": "uuid", "user": "Budi", "rating": 5, "comment": "Sangat membantu.", "date": "2026-02-01" }
  ]
}
```

### Response 404

Program tidak ditemukan. Body standar error:

```json
{ "error": "not_found", "message": "Program tidak ditemukan" }
```

---

## 3. Packages (Landing — Program yang Dibuka)

**GET /packages** — Daftar paket untuk section **Program yang Sedang Dibuka** di landing page. Tanpa auth. Response **snake_case**.

| Method | Endpoint   | Auth |
|--------|------------|------|
| GET    | `/packages`| Tidak |

### Response 200

Array of object (atau `{ "data": [...] }`). Field snake_case:

```json
[
  {
    "id": "uuid",
    "name": "Pelatihan Intensif OSN-K 2026 Informatika",
    "slug": "pelatihan-intensif-osn-k-2026",
    "short_description": "Program pelatihan khusus...",
    "price_display": null,
    "price_early_bird": "Rp349.000",
    "price_normal": "Rp500.000",
    "cta_label": "Daftar / Tanya",
    "wa_message_template": "Saya ingin bertanya detail terkait program...",
    "cta_url": null,
    "is_open": true,
    "is_bundle": false,
    "bundle_subtitle": null,
    "durasi": "4 Minggu",
    "materi": ["Strategi lolos seleksi OSN", "Algoritma yang sering keluar"],
    "fasilitas": ["2x Live Class per minggu", "2x Tryout Nasional"],
    "bonus": []
  }
]
```

- `materi`, `fasilitas`, `bonus`: array atau JSON string.
- Hanya tampilkan item dengan `is_open === true` di frontend (atau filter di backend).
- Schema: `database/landing_schema.sql` → tabel `packages`.

---

## 4. Flow Checkout

Checkout bisa **guest** (tanpa login) dengan nama + email, atau dengan user login.

### Alur Singkat

```
[Landing / Katalog] → Klik program → [Detail Program] → "Daftar Program"
  → [Checkout] Isi nama & email → POST /checkout/initiate
  → Dapat checkoutId → Pilih metode bayar (+ promo) → POST /checkout/payment-session
  → Dapat paymentUrl → Redirect ke gateway → User bayar
  → Gateway callback backend → Backend update order + enrollment
  → Redirect user ke #/checkout/success
```

### 4.1 Inisiasi Checkout

**POST /checkout/initiate** — Dapat `checkoutId` untuk langkah payment. **Jika sudah ada order pending untuk program yang sama dan akun yang sama, jangan buat order baru; kembalikan data order yang belum dibayar.**

| Method | Endpoint             | Auth   |
|--------|----------------------|--------|
| POST   | `/checkout/initiate` | Opsional (guest boleh) |

**Request Body**

```json
{
  "programSlug": "pelatihan-intensif-osn-k-2026",
  "name": "Nama Lengkap",
  "email": "email@example.com",
  "userId": "uuid-user-opsional",
  "expectedTotal": 349000,
  "normalPrice": 500000
}
```

- Alternatif: `programId` (uuid) instead of `programSlug`.
- `userId`: dikirim jika user login; **backend wajib**: cari order dengan status pending/unpaid untuk **user ini** + **program ini**. Jika ada, kembalikan order tersebut (jangan simpan order baru ke DB).
- **`expectedTotal`** (atau **`expected_total`** snake_case): frontend mengirim harga dari packages (integer). **Backend wajib pakai nilai ini** untuk set `total`, `finalPrice`, `priceDisplay` di response agar tidak 0.
- **`normalPrice`** (atau **`normal_price`**): harga normal program dari packages (opsional). Backend isi response `normalPrice` dari sini.
- Backend mengembalikan **confirmationCode** sebagai **number** (integer), bukan string, agar nominal verifikasi = total + confirmationCode bisa dihitung di frontend.

**Logika backend (wajib):**
1. Identifikasi user dari `userId` (jika ada) atau dari token Auth atau dari `email`.
2. Cari order yang sudah ada: program sama (programSlug/programId) + user sama + status pending/unpaid.
3. **Jika ketemu:** kembalikan `checkoutId`, `orderId`, `total`, `program` order tersebut (response 200/201). **Jangan buat order baru.**
4. Jika tidak ketemu, buat order baru seperti biasa.

**Response 201 (atau 200 bila mengembalikan order yang sudah ada)**

```json
{
  "checkoutId": "uuid-order-id",
  "orderId": "uuid",
  "total": 349000,
  "program": { "title": "Pelatihan Intensif OSN-K 2026", "priceDisplay": "Rp349.000" },
  "normalPrice": 500000,
  "finalPrice": 349000,
  "discountPercent": 0,
  "confirmationCode": 601,
  "priceDisplay": "Rp349.000"
}
```

- **total / finalPrice / normalPrice:** Harus diisi dari **expectedTotal** dan **normalPrice** request (bukan 0). Nominal transfer = finalPrice (atau total) + confirmationCode.
- **confirmationCode:** Kode unik 3 digit (100–999); **wajib tipe number (integer)** agar frontend bisa hitung nominal transfer = total + confirmationCode. Jangan kembalikan sebagai string.

**Error:** 400 (validasi), 404 (program tidak ada).

---

### 4.2 Sesi Pembayaran

**POST /checkout/payment-session** — Buat sesi pembayaran; saat user masuk halaman transfer, frontend mengirim nominal lengkap (termasuk kode unik). **Backend wajib menyimpan `amount` dan `uniqueCode` ke tabel order/transaksi** agar nominal tidak 0 di riwayat transaksi.

| Method | Endpoint                  | Auth   |
|--------|---------------------------|--------|
| POST   | `/checkout/payment-session` | Opsional |

**Request Body**

```json
{
  "checkoutId": "uuid-dari-initiate",
  "paymentMethod": "bank_transfer",
  "promoCode": "",
  "uniqueCode": 456,
  "amount": 349456
}
```

- `paymentMethod`: `bank_transfer` | `virtual_account` | `ewallet`
- `promoCode`: opsional
- `uniqueCode`: kode unik 3 digit (100–999) dari frontend; **simpan ke DB** untuk verifikasi transfer
- `amount`: jumlah yang harus dibayar (total + kode unik); **wajib disimpan ke order/transaksi** (update `total`/`amount` pada record yang berkaitan dengan `checkoutId`) agar GET /student/transactions mengembalikan nominal benar, bukan 0

**Response 200**

```json
{
  "paymentUrl": "https://gateway.example.com/...",
  "orderId": "uuid",
  "expiry": "2026-02-27T12:00:00Z",
  "virtualAccountNumber": "1234567890",
  "amount": 314100
}
```

- Frontend redirect user ke `paymentUrl` (atau tampilkan `virtualAccountNumber`).
- Setelah bayar, gateway memanggil callback backend → backend update order + enrollment.
- Redirect URL success dari gateway ke frontend: `#/checkout/success`.

---

## 5. Auth

| Method | Endpoint             | Deskripsi        |
|--------|----------------------|------------------|
| POST   | `/auth/register`     | Daftar akun      |
| POST   | `/auth/login`        | Login, dapat token |
| POST   | `/auth/logout`       | Logout (opsional di backend) |
| GET    | `/auth/me`           | Data user saat ini (Bearer wajib) |

### POST /auth/register

**Request:** `{ "name": "string", "email": "string", "password": "string", "role": "student" | "instructor" }`  
**Response 201:** `{ "user": { "id", "name", "email", "role" }, "token": "string" }`

### POST /auth/login

**Request:** `{ "email": "string", "password": "string" }`  
**Response 200:** `{ "user": { "id", "name", "email", "role" }, "token": "string" }`

### GET /auth/me

**Headers:** `Authorization: Bearer <token>`  
**Response 200:** `{ "id": "uuid", "name": "string", "email": "string", "role": "student" | "instructor" }`  
**Response 401:** Unauthorized.

---

## 6. Student & Instructor

Semua endpoint di bawah membutuhkan **Authorization: Bearer &lt;token&gt;** dan role yang sesuai.

### Student

| Method | Endpoint                  | Deskripsi              |
|--------|---------------------------|------------------------|
| GET    | `/student/dashboard`     | Ringkasan dashboard (stats, recent) |
| GET    | `/student/courses`        | Daftar kursus di-enroll + progress |
| GET    | `/student/transactions`   | Riwayat transaksi      |
| GET    | `/student/certificates`   | Daftar sertifikat      |
| GET    | `/student/profile`       | Profil                 |
| PUT    | `/student/profile`       | Update profil (body: name, email)   |

### Instructor

| Method | Endpoint                   | Deskripsi           |
|--------|----------------------------|---------------------|
| GET    | `/instructor/courses`     | Daftar program yang diajar |
| GET    | `/instructor/students`   | Daftar siswa (enrollment)  |
| GET    | `/instructor/earnings`   | Ringkasan pendapatan        |

Detail response shape ada di **docs/API_REQUIREMENTS.md**.

---

## 7. Error Response

Format konsisten:

```json
{ "error": "kode_error", "message": "Pesan untuk user" }
```

| Status | Keterangan        |
|--------|-------------------|
| 400    | Bad Request       |
| 401    | Unauthorized      |
| 404    | Not Found         |
| 422    | Validation Error  |
| 500    | Server Error      |

---

## Ringkasan Endpoint per Flow

| Flow / Fitur      | Endpoint                    | Method |
|-------------------|-----------------------------|--------|
| Katalog           | `/programs`                 | GET    |
| Detail product    | `/programs/:slug`          | GET    |
| Packages (landing)| `/packages`                 | GET    |
| Checkout (mulai)  | `/checkout/initiate`       | POST   |
| Checkout (bayar)  | `/checkout/payment-session`| POST   |
| Login/Register    | `/auth/login`, `/auth/register` | POST |
| Profil user       | `/auth/me`                  | GET    |
| Kursus saya       | `/student/courses`         | GET    |
| Transaksi         | `/student/transactions`     | GET    |

Contoh curl: **docs/API_CURL_EXAMPLES.md**.  
Schema database: **database/lms_schema.sql**, **database/landing_schema.sql**.

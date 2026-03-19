# cURL Terbaru — Semua Endpoint LMS & Landing

Base URL = `VITE_API_URL` di frontend (mis. `http://localhost:8080/api/v1`). Copy-paste perintah di bawah.

---

## Setup

```bash
BASE="http://localhost:8080/api/v1"
TOKEN=""   # isi setelah login untuk endpoint yang butuh Bearer
```

---

## Landing — Packages

```bash
# Daftar paket (section "Program yang Sedang Dibuka"). Response snake_case.
curl -s "$BASE/packages"
curl -s "$BASE/packages" | jq .
```

---

## Katalog & Detail Program

```bash
# Katalog (pagination, search, category)
curl -s "$BASE/programs?page=1&limit=12"
curl -s "$BASE/programs?page=1&limit=12&search=osn"
curl -s "$BASE/programs?page=1&limit=12&category=matematika"

# Detail program by slug — dari courses ATAU packages (fallback)
# Slug dari packages (landing):
curl -s "$BASE/programs/algorithm-programming-foundation"
curl -s "$BASE/programs/pelatihan-intensif-osn-k-2026"
curl -s "$BASE/programs/paket-hemat-foundation-osn"
# Slug dari courses (jika ada):
curl -s "$BASE/programs/<SLUG_COURSE>"
```

---

## Auth

```bash
# Register
curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Budi Siswa","email":"budi@example.com","password":"rahasia123"}'

curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Pak Instruktur","email":"instruktur@example.com","password":"rahasia123","role":"instructor"}'

# Login (simpan token ke $TOKEN)
curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"budi@example.com","password":"rahasia123"}'

# Profil saat ini
curl -s "$BASE/auth/me" -H "Authorization: Bearer $TOKEN"

# Logout
curl -s -X POST "$BASE/auth/logout" -H "Authorization: Bearer $TOKEN"
```

---

## Checkout

### 1. Login (ambil token)

```bash
BASE="http://localhost:8080/api/v1"
RES=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"budi@example.com","password":"rahasia123"}')
echo "$RES" | jq .
TOKEN=$(echo "$RES" | jq -r '.token')
```

### 2. Checkout initiate (pakai email sama dengan akun login)

Jika request dikirim **dengan Bearer token** (user sudah login), backend harus cek: apakah sudah ada order **pending** untuk **user ini** + **program ini**. Jika ada, kembalikan order itu (tanpa buat order baru).

```bash
# Tanpa Bearer: guest checkout (selalu buat order baru)
curl -s -X POST "$BASE/checkout/initiate" \
  -H "Content-Type: application/json" \
  -d '{"programSlug":"algorithm-programming-foundation","name":"Budi Siswa","email":"budi@example.com"}' | jq .

# Dengan Bearer: backend kembalikan order pending yang sama (jika ada) untuk user + program ini
curl -s -X POST "$BASE/checkout/initiate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"programSlug":"algorithm-programming-foundation","name":"Budi Siswa","email":"budi@example.com"}' | jq .
```

Opsional: kirim `userId` di body (frontend kirim saat user login). Backend bisa pakai `userId` atau identitas dari token untuk cari order pending.

### 3. Payment session (lanjut ke halaman transfer)

Pakai `checkoutId` dari response initiate. Kirim `amount` (nominal + kode unik) dan `uniqueCode` agar backend simpan ke transaksi (nominal tidak 0).

```bash
CHECKOUT_ID="<CHECKOUT_ID_DARI_INITIATE>"
# Minimal
curl -s -X POST "$BASE/checkout/payment-session" \
  -H "Content-Type: application/json" \
  -d "{\"checkoutId\":\"$CHECKOUT_ID\",\"paymentMethod\":\"bank_transfer\",\"promoCode\":\"\"}" | jq .

# Dengan amount & uniqueCode (disarankan agar nominal tersimpan)
curl -s -X POST "$BASE/checkout/payment-session" \
  -H "Content-Type: application/json" \
  -d "{\"checkoutId\":\"$CHECKOUT_ID\",\"paymentMethod\":\"bank_transfer\",\"promoCode\":\"\",\"uniqueCode\":456,\"amount\":349456}" | jq .
```

### 4. Lihat transaksi / order (pakai token)

```bash
curl -s "$BASE/student/transactions" -H "Authorization: Bearer $TOKEN" | jq .
```

### 5. Guest checkout -> register inline -> upload bukti (flow utama)

```bash
# 1) Checkout initiate sebagai guest (tanpa Bearer)
RES=$(curl -s -X POST "$BASE/checkout/initiate" \
  -H "Content-Type: application/json" \
  -d '{"programSlug":"pelatihan-intensif-osn-k-2026","name":"Budi Siswa","email":"budi@example.com","expectedTotal":349000,"normalPrice":500000}')
echo "$RES" | jq .
CHECKOUT_ID=$(echo "$RES" | jq -r '.checkoutId')

# 2) Payment session
curl -s -X POST "$BASE/checkout/payment-session" \
  -H "Content-Type: application/json" \
  -d "{\"checkoutId\":\"$CHECKOUT_ID\",\"paymentMethod\":\"bank_transfer\",\"uniqueCode\":456,\"amount\":349456}" | jq .

# 3) Register (upsert: buat akun baru atau update existing jika email sudah ada)
#    Tidak ada lagi 409 — selalu return 201 + token
REG=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Budi Siswa","email":"budi@example.com","password":"rahasiaBaru123","role":"student"}')
echo "$REG" | jq .
TOKEN=$(echo "$REG" | jq -r '.token')

# 4) Sekarang sudah login, bisa akses dashboard / upload bukti
curl -s "$BASE/student/transactions" -H "Authorization: Bearer $TOKEN" | jq .
```

### 5b. Fallback: complete-purchase-auth (opsional, untuk callback gateway)

```bash
ORDER_ID="<ORDER_ID>"
BOOTSTRAP=$(curl -s -X POST "$BASE/checkout/orders/$ORDER_ID/complete-purchase-auth" \
  -H "Content-Type: application/json" \
  -d '{"source":"payment_success"}')
echo "$BOOTSTRAP" | jq .
BOOTSTRAP_TOKEN=$(echo "$BOOTSTRAP" | jq -r '.auth.token')

# Jika mustSetPassword=true, wajib set password dulu
curl -s -X POST "$BASE/auth/set-password" \
  -H "Authorization: Bearer $BOOTSTRAP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"rahasiaBaru123"}' | jq .
```

---

## Satu blok: Login → Checkout → Payment session → Transaksi

```bash
BASE="http://localhost:8080/api/v1"

# 1) Login
RES=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"budi@example.com","password":"rahasia123"}')
TOKEN=$(echo "$RES" | jq -r '.token')
echo "Token: $TOKEN"

# 2) Checkout initiate (pakai Bearer agar backend kembalikan order pending yang sama jika ada)
RES=$(curl -s -X POST "$BASE/checkout/initiate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"programSlug":"algorithm-programming-foundation","name":"Budi Siswa","email":"budi@example.com"}')
echo "$RES" | jq .
CHECKOUT_ID=$(echo "$RES" | jq -r '.checkoutId')
ORDER_ID=$(echo "$RES" | jq -r '.orderId')

# 3) Payment session (amount & uniqueCode agar nominal tersimpan)
curl -s -X POST "$BASE/checkout/payment-session" \
  -H "Content-Type: application/json" \
  -d "{\"checkoutId\":\"$CHECKOUT_ID\",\"paymentMethod\":\"bank_transfer\",\"promoCode\":\"\",\"uniqueCode\":456,\"amount\":349456}" | jq .

# 4) Daftar transaksi user
curl -s "$BASE/student/transactions" -H "Authorization: Bearer $TOKEN" | jq .
```

Ganti `budi@example.com` / `rahasia123` dengan email dan password akun yang sudah terdaftar.

---

## Student (Bearer required)

```bash
curl -s "$BASE/student/dashboard"       -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/student/profile"         -H "Authorization: Bearer $TOKEN"
curl -s -X PUT "$BASE/student/profile"   -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nama Baru","email":"email@baru.com"}'
curl -s "$BASE/student/courses"         -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/student/transactions"   -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/student/certificates"   -H "Authorization: Bearer $TOKEN"
```

---

## Instructor (Bearer required)

```bash
curl -s "$BASE/instructor/courses"   -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/instructor/students"  -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/instructor/earnings"  -H "Authorization: Bearer $TOKEN"
```

---

## Satu blok lengkap (copy-paste)

```bash
BASE="http://localhost:8080/api/v1"

# Packages (landing)
curl -s "$BASE/packages" | jq .

# Katalog program
curl -s "$BASE/programs?page=1&limit=12" | jq .

# Detail program — slug dari packages
curl -s "$BASE/programs/pelatihan-intensif-osn-k-2026" | jq .

# Login & simpan token
RES=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"budi@example.com","password":"rahasia123"}')
TOKEN=$(echo "$RES" | jq -r '.token')
echo "TOKEN=$TOKEN"

# Profil & kursus
curl -s "$BASE/auth/me" -H "Authorization: Bearer $TOKEN" | jq .
curl -s "$BASE/student/courses" -H "Authorization: Bearer $TOKEN" | jq .
```

Tanpa `jq`: hapus `| jq .` dan `| jq -r '.token'`.

---

## Ringkasan URL

| Endpoint | Method | Auth |
|----------|--------|------|
| `/packages` | GET | - |
| `/programs?page=1&limit=12` | GET | - |
| `/programs/:slug` | GET | - |
| `/auth/register` | POST | - |
| `/auth/login` | POST | - |
| `/auth/set-password` | POST | Bearer |
| `/auth/me` | GET | Bearer |
| `/auth/logout` | POST | Bearer |
| `/checkout/initiate` | POST | Opsional (Bearer agar kembalikan order pending yang sama) |
| `/checkout/payment-session` | POST | - |
| `/checkout/orders/:orderId/complete-purchase-auth` | POST | Opsional |
| `/student/dashboard` | GET | Bearer |
| `/student/profile` | GET / PUT | Bearer |
| `/student/courses` | GET | Bearer |
| `/student/transactions` | GET | Bearer |
| `/student/certificates` | GET | Bearer |
| `/instructor/courses` | GET | Bearer |
| `/instructor/students` | GET | Bearer |
| `/instructor/earnings` | GET | Bearer |

**Error response:** `{ "error": "kode", "message": "pesan" }` (400, 401, 404, 422).

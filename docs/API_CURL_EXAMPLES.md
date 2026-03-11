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

## Checkout (tanpa login / guest)

```bash
# 1. Initiate — pakai programSlug (slug dari packages atau courses)
curl -s -X POST "$BASE/checkout/initiate" \
  -H "Content-Type: application/json" \
  -d '{"programSlug":"pelatihan-intensif-osn-k-2026","name":"Budi Siswa","email":"budi@example.com"}'

# 2. Payment session — pakai checkoutId dari response initiate
curl -s -X POST "$BASE/checkout/payment-session" \
  -H "Content-Type: application/json" \
  -d '{"checkoutId":"<ORDER_ID>","paymentMethod":"bank_transfer","promoCode":""}'
```

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
| `/auth/me` | GET | Bearer |
| `/auth/logout` | POST | Bearer |
| `/checkout/initiate` | POST | - |
| `/checkout/payment-session` | POST | - |
| `/student/dashboard` | GET | Bearer |
| `/student/profile` | GET / PUT | Bearer |
| `/student/courses` | GET | Bearer |
| `/student/transactions` | GET | Bearer |
| `/student/certificates` | GET | Bearer |
| `/instructor/courses` | GET | Bearer |
| `/instructor/students` | GET | Bearer |
| `/instructor/earnings` | GET | Bearer |

**Error response:** `{ "error": "kode", "message": "pesan" }` (400, 401, 404, 422).

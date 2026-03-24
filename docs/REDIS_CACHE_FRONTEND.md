# Redis & cache server-side — panduan Flutter / web

**Redis bukan sesuatu yang dihubungkan langsung dari aplikasi klien.** Aplikasi mobile (Flutter) dan browser hanya berbicara dengan **HTTP + JSON** ke API backend. Redis dipakai **hanya di server** untuk cache, sorted set leaderboard, dll.

**Base URL (sama dengan proyek ini):** `{VITE_API_URL}` biasanya `http://localhost:8080/api/v1` — path di bawah mengasumsikan prefix `/api/v1` sudah termasuk di base.

---

## 1. Prinsip utama

| Aspek | Penjelasan |
|--------|------------|
| **Koneksi Redis** | Hanya backend API yang pakai Redis. Frontend tidak memakai host/port/password Redis atau URL `rediss://`. |
| **Kontrak untuk FE** | Tetap HTTP + JSON seperti endpoint biasa. Tidak ada header khusus “Redis” yang wajib. |
| **Jika Redis mati** | API tetap bisa jalan (fallback / no-cache tergantung endpoint); geo, daftar sekolah/paket, atau leaderboard bisa lebih lambat atau kurang optimal. |
| **Implementasi di frontend** | Memanggil endpoint yang sama; backend yang mengisi Redis secara internal. Opsional: cache lokal app + pull-to-refresh — **bukan** koneksi Redis. |

---

## 2. Endpoint yang terdampak cache Redis (server-side)

Gunakan endpoint yang sama; perilaku cache adalah detail server. **Nama key Redis di tabel hanya untuk dokumentasi backend/DevOps** — klien tidak perlu (dan tidak seharusnya) bergantung pada nama key.

### Wilayah (geo)

| Endpoint | Perilaku FE | Cache server (contoh key) | TTL server (contoh env) |
|----------|-------------|---------------------------|-------------------------|
| `GET /geo/provinces` | Dropdown provinsi; pull-to-refresh jika perlu data terbaru | `province:list` | `GEO_CACHE_TTL_SECONDS` (~7 hari, sesuai kebijakan deploy) |
| `GET /geo/regencies/{provinceId}` | Dropdown kab/kota setelah provinsi dipilih | `city:list:{province_id}` | sama |

Konvensi key alternatif untuk geo saja: lihat **docs/GEO_REDIS_BACKEND.md** (mis. prefix `fansedu:geo:…`). Yang penting untuk FE: **URL dan JSON response tetap sama** dengan atau tanpa Redis.

### Sekolah

| Endpoint | Perilaku FE | Cache server (contoh) | TTL (contoh) |
|----------|-------------|----------------------|--------------|
| `GET /schools?q=...` | Autocomplete; query `q` opsional. Backend bisa cache **daftar penuh** lalu filter `q` di memori. | `school:list` | `SCHOOL_LIST_CACHE_SECONDS` (~12 jam) |

Setelah admin mengubah data sekolah, user lain bisa melihat data lama sampai TTL kecuali server melakukan invalidasi. **UX:** refresh manual, atau coba lagi setelah beberapa saat.

### Paket landing

| Endpoint | Perilaku FE | Cache server (contoh) | TTL (contoh) |
|----------|-------------|----------------------|--------------|
| `GET /packages` | Halaman landing program | `packages:list` | `PACKAGES_LIST_CACHE_SECONDS` (~12 jam) |

### Leaderboard tryout (Redis sorted set)

| Endpoint | Auth | Perilaku FE |
|----------|------|-------------|
| `GET /tryouts/{tryoutId}/leaderboard/top?limit=` | Biasanya publik (sesuai kebijakan API) | Top N — cepat dari Redis ZSET; UI “top 10”. Key server contoh: `leaderboard:{tryout_id}` |
| `GET /tryouts/{tryoutId}/leaderboard/rank` | **JWT** | Posisi + skor user saat ini |
| `GET /tryouts/{tryoutId}/leaderboard` | Sesuai kebijakan API | Leaderboard penuh dari DB — bisa lebih berat |

Skor di Redis **tanpa TTL** yang wajar untuk “live ranking” (persist sampai dihapus/overwrite di server). **Bukan WebSocket** — untuk UI hampir live, **polling ringan** ke `/leaderboard/top` (mis. setiap 10–30 detik saat layar ranking terbuka).

---

## 3. Yang tidak perlu di frontend

- Package `redis` / `ioredis` / koneksi `rediss://` di Flutter atau browser.
- Mengetahui atau mengirim **nama key Redis** (`province:list`, dll.) — itu internal backend; berguna untuk dokumentasi dan debug server saja.

---

## 4. Yang boleh di frontend (opsional)

| Strategi | Kapan dipakai |
|----------|----------------|
| **Pull-to-refresh** | Setelah admin mengubah master data (sekolah, paket) atau user ingin data terbaru. |
| **Cache lokal** (Hive, shared_preferences, dll.) | Kurangi request untuk geo/sekolah; TTL sendiri (mis. 1 jam) — data bisa sedikit stale vs server. |
| **Polling leaderboard** | Bukan server-push; polling `/leaderboard/top` saat layar ranking aktif. |
| **Debounced search sekolah** | Tetap `GET .../schools?q=`; hindari spam request saat user mengetik. |

---

## 5. Variabel lingkungan (hanya backend / DevOps)

Frontend **tidak** memuat `REDIS_URL`, `GEO_CACHE_TTL_SECONDS`, `SCHOOL_LIST_CACHE_SECONDS`, `PACKAGES_LIST_CACHE_SECONDS`, dll. — itu untuk proses API server saja.

Untuk sumber geo dari API internal (proyek Vite ini), frontend memakai **`VITE_GEO_SOURCE=internal`** dan `VITE_API_URL` — lihat **docs/GEO_REDIS_BACKEND.md** dan **docs/API_REQUIREMENTS.md**.

---

## 6. Ringkas untuk task implementasi Flutter

1. **Geo:** `GET .../geo/provinces` lalu `GET .../geo/regencies/{id}` — tidak ada perbedaan kontrak API dengan/tanpa Redis.
2. **Sekolah & paket:** `GET .../schools` (dengan `q` opsional) dan `GET .../packages` — sama; pertimbangkan UX refresh jika data admin berubah.
3. **Leaderboard:** integrasi `/leaderboard/top` + `/leaderboard/rank` (dengan token); jangan mengharapkan koneksi Redis dari app.

---

## 7. Contoh bentuk response (mapping model Flutter)

Schema resmi untuk sebagian endpoint: **docs/openapi.yaml** (`GeoWilayahItem`, `PackageItem`, dll.). Ringkasan praktis:

### Geo (`GeoWilayahItem`)

Array objek:

```json
[
  { "id": "11", "name": "ACEH" },
  { "id": "12", "name": "SUMATERA UTARA" }
]
```

### Paket landing (`PackageItem`, snake_case)

Array objek dengan field seperti `id`, `name`, `slug`, `short_description`, `price_display`, `cta_label`, `is_open`, `materi`, `fasilitas`, … — lihat komponen schema `PackageItem` di OpenAPI.

### Sekolah (daftar)

Backend bisa mengembalikan **array langsung** atau objek dengan `data` / `schools` berisi array. Elemen umum untuk mapping: `id`, `name`, opsional `slug`, `description`, `address`, `logo_url` / `logoUrl`. Frontend web proyek ini mem-parse beberapa bentuk di `getSchools()` — lihat **src/lib/api.ts** (`getSchools`).

### Leaderboard

Bentuk pasti mengikuti DTO backend (top entries: user/rank/score; `/rank`: posisi user + skor). Saat OpenAPI untuk tryout leaderboard ditambahkan, generate model dari situ.

---

## Lihat juga

- **docs/GEO_REDIS_BACKEND.md** — detail cache provinsi/kab-kota, pseudo-code Redis, `VITE_GEO_SOURCE`.
- **docs/API_REQUIREMENTS.md** — daftar endpoint LMS.
- **docs/API_CURL_EXAMPLES.md** — contoh `curl` untuk geo dan lainnya.
- **docs/openapi.yaml** — kontrak JSON untuk generate client.

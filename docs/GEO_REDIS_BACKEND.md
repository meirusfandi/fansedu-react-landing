# Cache Provinsi & Kabupaten/Kota di Redis (Backend)

Frontend saat ini bisa memuat data wilayah dari API publik (mis. emsifa) atau dari **API internal** Anda. **Redis hanya bisa dipakai di server** (Go, Node, dll.) — tidak dari browser.

**Lihat juga:** **docs/REDIS_CACHE_FRONTEND.md** — panduan lengkap untuk Flutter/web (HTTP saja, endpoint geo/sekolah/paket/leaderboard, apa yang tidak perlu di klien, TTL & env hanya backend).

Tujuan: response cepat dan stabil, tanpa memukul API eksternal setiap request.

---

## Alur singkat

1. Request masuk: `GET /api/v1/geo/provinces` atau `GET /api/v1/geo/regencies/:provinceId`.
2. **Cek Redis** — jika key ada, kembalikan JSON dari cache (satu round-trip ke Redis, sangat cepat).
3. Jika **miss**: ambil dari sumber (HTTP ke emsifa, file statis, atau DB), **SET ke Redis** dengan TTL, lalu kembalikan ke client.

---

## Rekomendasi key Redis

Gunakan prefix agar tidak bentrok dengan key lain:

| Key | Isi | TTL (disarankan) |
|-----|-----|--------------------|
| `fansedu:geo:provinces:v1` | JSON array `[{ "id", "name" }, ...]` | **30 hari** (data jarang berubah) |
| `fansedu:geo:regencies:v1:{provinceId}` | JSON array kab/kota untuk provinsi itu | **30 hari** |

- **Versi `v1`** di key: jika format response berubah, ganti ke `v2` dan biarkan TTL lama expire sendiri, atau hapus key lama sekali.
- **TTL panjang** wajar karena master wilayah RI jarang di-update; jika butuh refresh paksa, sediakan endpoint admin atau job harian yang `DEL` key lalu warm cache.

---

## Contoh pseudo-code (Node / ioredis)

```js
const TTL_SECONDS = 30 * 24 * 3600 // 30 hari
const PROV_KEY = 'fansedu:geo:provinces:v1'
const regenciesKey = (id) => `fansedu:geo:regencies:v1:${id}`

async function getProvinces(redis, fetchFromUpstream) {
  const cached = await redis.get(PROV_KEY)
  if (cached) return JSON.parse(cached)
  const data = await fetchFromUpstream() // GET emsifa provinces.json
  await redis.setex(PROV_KEY, TTL_SECONDS, JSON.stringify(data))
  return data
}

async function getRegencies(redis, provinceId, fetchFromUpstream) {
  const key = regenciesKey(provinceId)
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)
  const data = await fetchFromUpstream(provinceId)
  await redis.setex(key, TTL_SECONDS, JSON.stringify(data))
  return data
}
```

---

## Kontrak response (sama dengan sumber emsifa)

Array objek minimal:

```json
[
  { "id": "11", "name": "ACEH" },
  { "id": "12", "name": "SUMATERA UTARA" }
]
```

Frontend memetakan `id` → string, `name` → string.

---

## Setelah backend siap

Di frontend, set environment:

```env
VITE_GEO_SOURCE=internal
```

Agar request wilayah memakai `GET {VITE_API_URL}/geo/provinces` dan `GET .../geo/regencies/:id` (lihat **docs/API_REQUIREMENTS.md** dan **docs/openapi.yaml**).

---

## Catatan operasional

- **Rate limit** upstream: cache Redis menghilangkan lonjakan request ke emsifa.
- **Fallback**: jika Redis down, backend bisa fetch upstream sekali (lebih lambat) atau kembalikan 503 dengan pesan jelas.
- **Stale-while-revalidate** (opsional): kembalikan cache lama sambil refresh di background — hanya jika traffic tinggi dan Anda butuh UX ekstra.

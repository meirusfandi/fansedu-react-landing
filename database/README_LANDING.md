# Schema & API Landing Page (Backend-Driven Content)

Semua konten yang tampil di landing dapat diambil dari backend. Gunakan `landing_schema.sql` untuk membuat tabel, lalu expose API yang mengembalikan data sesuai format di bawah.

## Tabel di `landing_schema.sql`

| Tabel | Kegunaan |
|-------|----------|
| **site_settings** | Key-value: teks hero, about, footer, nomor WA, sosial media |
| **about_highlights** | Daftar poin (Online Learning, Free TryOut, Dashboard Interaktif, dll.) |
| **services** | Section Layanan: judul + deskripsi per layanan |
| **features** | Section Keunggulan: judul + deskripsi per poin |
| **packages** | Paket / program yang sedang dibuka (nama, deskripsi, harga, CTA) |
| **contact_links** | Kontak (WhatsApp, Instagram, TikTok, YouTube: title, subtitle, href) |
| **articles** | Lihat `schema.sql` — artikel blog |

## Rekomendasi API

- `GET /api/v1/site` → gabungan `site_settings` (object key-value).
- `GET /api/v1/about-highlights` → array `about_highlights` (urut `sort_order`).
- `GET /api/v1/services` → array `services`.
- `GET /api/v1/features` → array `features`.
- `GET /api/v1/packages` → array **packages** dengan `is_open = true`, urut `sort_order`.
- `GET /api/v1/contact-links` → array `contact_links`.
- Artikel: `GET /api/v1/articles` (list), `GET /api/v1/articles/:slug` (detail).

## Format Response untuk Frontend

### Packages (sudah dipakai di App)

```json
[
  {
    "id": "uuid",
    "name": "Nama Program",
    "slug": "slug-program",
    "short_description": "Deskripsi singkat.",
    "price_display": "Hubungi kami",
    "price_early_bird": "Rp249.000",
    "price_normal": "Rp399.000",
    "durasi": "4 Minggu",
    "materi": ["Materi 1", "Materi 2"],
    "fasilitas": ["Fasilitas 1", "Fasilitas 2"],
    "cta_url": "https://wa.me/62...",
    "cta_label": "Daftar",
    "is_open": true,
    "is_bundle": false
  }
]
```

- **materi** / **fasilitas**: array of string, atau string JSON array `"[\"Item 1\"]"`.
- **price_early_bird** & **price_normal**: tampil sebagai “Early Bird” dan “Harga Normal”. Jika tidak ada, pakai **price_display** saja.
- **is_bundle**: `true` untuk paket gabungan (kartu dapat aksen “Paket Hemat”).

### Site settings (saran)

```json
{
  "hero_tagline": "...",
  "hero_headline": "...",
  "about_intro": "...",
  "about_teachers": "...",
  "contact_wa": "6285121277161",
  "contact_wa_display": "+62 851-2127-7161"
}
```

### About highlights, services, features

Array of `{ id, title/label, description }` + `sort_order` untuk urutan.

### Contact links

Array of `{ id, title, subtitle, href, sort_order }`.

---

Frontend saat ini: **packages** di-fetch dari `VITE_API_BASE_URL + /api/v1/packages` (fallback mock). Artikel dari `VITE_ARTICLES_API_URL`. Setelah backend menyediakan endpoint di atas, Anda bisa menambah fetch untuk `site_settings`, `about_highlights`, `services`, `features`, dan `contact_links` lalu mengganti konten statis dengan data dari API.

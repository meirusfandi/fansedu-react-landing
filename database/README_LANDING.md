# Schema & API Landing Page (Admin-Managed Content)

Semua konten yang tampil di landing page dapat diatur melalui backend/admin. Gunakan `landing_schema.sql` untuk membuat tabel, lalu expose API yang mengembalikan data sesuai format di bawah.

---

## Tabel di `landing_schema.sql`

| Tabel | Kegunaan |
|-------|----------|
| **site_settings** | Key-value: teks hero, urgency, CTA, WA templates, register_url, solusi, masalah, fitur, tryout, request, contact, footer, visual proof |
| **hero_badges** | 3 poin di bawah hero (✔ Mentor berpengalaman, 2x Tryout Nasional, Dashboard Ranking) |
| **social_proof_stats** | Angka section (20+, 2x, 100%, sejak 2014) |
| **masalah_items** | Section "Masalah Siswa": judul + deskripsi per kartu |
| **solusi_highlights** | Bullet list section Solusi (Kurikulum terstruktur, Tryout nasional, dll.) |
| **features** | Section "Fitur Program": judul + deskripsi per poin |
| **packages** | Paket/program yang sedang dibuka (nama, slug, harga, materi, fasilitas, bonus, bundle_subtitle) |
| **testimonials** | Section Testimoni: quote, author, role |
| **tryout_steps** | 4 langkah section TryOut (Tryout gratis, Lihat ranking, dll.) |
| **contact_links** | Kontak (WhatsApp, Instagram, TikTok, YouTube) |
| **nav_items** | Opsional: urutan & label link navbar/footer |
| **about_highlights** | Daftar poin (jika dipakai) |
| **services** | Section Layanan (jika dipakai) |

---

## Key `site_settings` (untuk Admin Panel)

Admin mengisi key-value berikut. Frontend memakai key ini untuk teks dinamis.

### Hero
- `hero_badge` — Badge kecil di atas headline
- `hero_headline_1` — Baris pertama headline
- `hero_headline_2` — Baris kedua (accent)
- `hero_subheadline` — Paragraf di bawah headline
- `hero_cta_primary` — Teks tombol "Daftar Sekarang"
- `hero_cta_secondary` — Teks tombol "Tanya Program"
- `hero_cta_tertiary` — Teks link "Pelajari Lebih Lanjut"

### Urgency (CTA & kartu program)
- `urgency_batch` — Contoh: "Batch April 2026"
- `urgency_quota_max` — Angka kuota, contoh: "30"
- `urgency_early_bird_end` — ISO 8601, contoh: "2026-03-17T23:59:59+07:00"

### Section CTA (Siap Lolos OSN-K?)
- `cta_headline` — "Siap Lolos"
- `cta_headline_accent` — "OSN-K 2026?"
- `cta_subtitle` — Paragraf
- `cta_button_primary` — "Daftar Sekarang"
- `cta_button_secondary` — "Tanya Program"

### WA & link
- `wa_number` — Nomor WA tanpa +, contoh: "6285121277161"
- `wa_template_navbar`, `wa_template_hero`, `wa_template_tanya`, `wa_template_request`, `wa_template_contact`, `wa_template_float` — Template pesan WA per section
- `register_url` — URL daftar (LMS), contoh: "https://app.fansedu.web.id/register"

### Solusi, Masalah, Fitur, Tryout, Request, Contact, Footer
- `solusi_badge`, `solusi_headline`, `solusi_paragraph_1`, `solusi_paragraph_2`, `solusi_logo_url`
- `masalah_badge`, `masalah_headline`, `masalah_subtitle`
- `features_badge`, `features_headline`
- `tryout_badge`, `tryout_headline`, `tryout_subtitle`, `tryout_cta_text`, `tryout_cta_href`
- `request_badge`, `request_headline`, `request_subtitle`, `request_button`
- `contact_badge`, `contact_headline`, `contact_subtitle`
- `footer_logo_text`, `footer_tagline`, `footer_copyright`

### Visual proof (screenshot)
- `visual_headline`
- `visual_leaderboard_url`, `visual_leaderboard_title`, `visual_leaderboard_desc`
- `visual_dashboard_url`, `visual_dashboard_title`, `visual_dashboard_desc`
- `visual_kelas_url`, `visual_kelas_title`, `visual_kelas_desc`

---

## Rekomendasi API untuk Frontend

| Endpoint | Method | Kegunaan |
|----------|--------|----------|
| `/api/v1/site` | GET | Object key-value dari `site_settings` |
| `/api/v1/hero-badges` | GET | Array `hero_badges` (urut `sort_order`) |
| `/api/v1/social-proof` | GET | Array `social_proof_stats` |
| `/api/v1/masalah` | GET | Array `masalah_items` |
| `/api/v1/solusi-highlights` | GET | Array `solusi_highlights` |
| `/api/v1/features` | GET | Array `features` |
| `/api/v1/packages` | GET | Array `packages` dengan `is_open = true` |
| `/api/v1/testimonials` | GET | Array `testimonials` dengan `is_active = true` |
| `/api/v1/tryout-steps` | GET | Array `tryout_steps` |
| `/api/v1/contact-links` | GET | Array `contact_links` |
| `/api/v1/nav-items` | GET | Array `nav_items` dengan `is_visible = true` |

---

## Format Response untuk Frontend

### Packages (sudah dipakai di App)

```json
[
  {
    "id": "uuid",
    "name": "Nama Program",
    "slug": "slug-program",
    "short_description": "Deskripsi singkat.",
    "price_early_bird": "Rp249.000",
    "price_normal": "Rp399.000",
    "cta_label": "Daftar / Tanya",
    "wa_message_template": "Saya ingin bertanya...",
    "is_open": true,
    "is_bundle": false,
    "bundle_subtitle": "Foundation + OSN Training",
    "durasi": "4 Minggu",
    "materi": ["Materi 1", "Materi 2"],
    "fasilitas": ["Fasilitas 1"],
    "bonus": ["Bank soal OSN", "Rekaman kelas"],
    "sort_order": 0
  }
]
```

- **materi**, **fasilitas**, **bonus**: array of string atau string JSON array.
- **bundle_subtitle**: untuk paket bundle (tampil di kartu).
- Frontend membangun link WA dari `wa_number` + `wa_message_template`.

### Site settings

```json
{
  "hero_headline_1": "Persiapan OSN Informatika 2026",
  "hero_headline_2": "Mulai dari Dasar sampai Lolos OSN-K",
  "wa_number": "6285121277161",
  "register_url": "https://app.fansedu.web.id/register",
  "urgency_batch": "Batch April 2026",
  "urgency_quota_max": "30",
  "urgency_early_bird_end": "2026-03-17T23:59:59+07:00"
}
```

### Hero badges, social proof, masalah, solusi_highlights, features, testimonials, tryout_steps

- Array of object dengan field sesuai tabel + `sort_order`.
- Urutkan berdasarkan `sort_order`.

### Contact links

- Array of `{ id, title, subtitle, href, sort_order }`.

### Nav items

- Array of `{ id, label, anchor, sort_order }` untuk build link `#anchor`.

---

## Frontend saat ini

- **Packages**: fetch dari `VITE_API_BASE_URL + /api/v1/packages` (fallback mock di App).
- Setelah backend menyediakan endpoint di atas, tambahkan fetch untuk `site_settings`, `hero_badges`, `social_proof_stats`, `masalah_items`, `solusi_highlights`, `features`, `testimonials`, `tryout_steps`, `contact_links`, `nav_items` dan ganti konten statis di `App.tsx` dengan data dari API.

-- =============================================================================
-- Schema Landing Page & Konten yang Dikelola Backend
-- =============================================================================
-- Untuk PostgreSQL. Untuk MySQL: ganti TIMESTAMP WITH TIME ZONE → DATETIME,
-- dan sesuaikan DEFAULT NOW() → CURRENT_TIMESTAMP.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Site settings (key-value untuk teks global: hero, about, footer, kontak)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);

-- Contoh isi (bisa di-seed dari backend/admin):
-- INSERT INTO site_settings (key, value) VALUES
--   ('hero_tagline', 'Pelatihan OSN Informatika Terpercaya'),
--   ('hero_headline', 'Raih Medali di OSN Informatika Bersama Kami'),
--   ('hero_subtitle', 'Program pelatihan intensif dengan metode...'),
--   ('about_intro', 'Fansedu Informatic Olympiad hadir sebagai solusi...'),
--   ('about_paragraph2', 'Fansedu baru berdiri pada 2026...'),
--   ('about_teachers', 'Tim pengajar berasal dari latar belakang: Ex-OSN Informatika...'),
--   ('contact_wa', '6285121277161'),
--   ('contact_wa_display', '+62 851-2127-7161'),
--   ('contact_instagram', '@fansedu.official'),
--   ('contact_tiktok', '@fansedu.official'),
--   ('contact_youtube', '@fansedu.official'),
--   ('footer_tagline', 'Platform pelatihan OSN Informatika terpercaya...'),
--   ('footer_copyright', '2026 Fansedu Informatic Olympiad. All rights reserved.');


-- -----------------------------------------------------------------------------
-- 2. About highlights (list: Online Learning, Free TryOut, Dashboard Interaktif, dll.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS about_highlights (
  id         VARCHAR(36) PRIMARY KEY,
  label      VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_about_highlights_sort ON about_highlights(sort_order);


-- -----------------------------------------------------------------------------
-- 3. Services (section Layanan: Pelatihan Online, TryOut Berkala, dll.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id          VARCHAR(36) PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_services_sort ON services(sort_order);


-- -----------------------------------------------------------------------------
-- 4. Features (section Keunggulan: Pembelajaran Efektif, Akses 24/7, dll.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS features (
  id          VARCHAR(36) PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_features_sort ON features(sort_order);


-- -----------------------------------------------------------------------------
-- 5. Packages / Program (paket yang sedang dibuka — menu program)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS packages (
  id                VARCHAR(36) PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) NOT NULL UNIQUE,
  short_description TEXT,
  price_display     VARCHAR(100),
  price_early_bird  VARCHAR(100),
  price_normal      VARCHAR(100),
  cta_url           VARCHAR(1024),
  cta_label         VARCHAR(100) DEFAULT 'Daftar',
  is_open           BOOLEAN NOT NULL DEFAULT true,
  is_bundle         BOOLEAN NOT NULL DEFAULT false,
  durasi            VARCHAR(100),
  materi            TEXT,
  fasilitas         TEXT,
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- materi & fasilitas: simpan sebagai JSON array string, e.g. '["Item 1","Item 2"]'
CREATE INDEX IF NOT EXISTS idx_packages_is_open_sort ON packages(is_open, sort_order);


-- -----------------------------------------------------------------------------
-- 6. Contact links (WhatsApp, Instagram, TikTok, YouTube — untuk tampilan & link)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_links (
  id         VARCHAR(36) PRIMARY KEY,
  title      VARCHAR(100) NOT NULL,
  subtitle   VARCHAR(255),
  href       VARCHAR(1024) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_contact_links_sort ON contact_links(sort_order);


-- -----------------------------------------------------------------------------
-- 7. Articles (sudah ada di schema.sql; di sini sebagai referensi)
-- -----------------------------------------------------------------------------
-- Lihat database/schema.sql untuk definisi tabel articles.

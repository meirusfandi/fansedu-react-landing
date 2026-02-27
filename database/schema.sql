-- Schema tabel artikel untuk database (PostgreSQL / MySQL compatible)
-- Sesuaikan tipe data jika pakai MySQL (e.g. SERIAL -> AUTO_INCREMENT, TEXT tetap)

-- Tabel: articles
CREATE TABLE IF NOT EXISTS articles (
  id          VARCHAR(36) PRIMARY KEY,
  slug        VARCHAR(255) NOT NULL UNIQUE,
  title       VARCHAR(500) NOT NULL,
  excerpt     TEXT NOT NULL,
  content     TEXT NOT NULL,
  image       VARCHAR(1024),
  category    VARCHAR(100),
  author      VARCHAR(255),
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index untuk pencarian dan list by slug
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);

-- Contoh (opsional): tabel categories jika ingin normalisasi
-- CREATE TABLE IF NOT EXISTS article_categories (
--   id   VARCHAR(36) PRIMARY KEY,
--   name VARCHAR(100) NOT NULL UNIQUE
-- );
-- ALTER TABLE articles ADD COLUMN category_id VARCHAR(36) REFERENCES article_categories(id);

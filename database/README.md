# Schema Database Artikel

Gunakan `schema.sql` untuk membuat tabel artikel di database Anda.

## PostgreSQL

```bash
psql -U user -d dbname -f schema.sql
```

## MySQL

Untuk MySQL, ganti tipe berikut jika perlu:

- `VARCHAR(36)` untuk id tetap
- `TIMESTAMP WITH TIME ZONE` → `DATETIME` atau `TIMESTAMP`
- `SERIAL` / sequence tidak dipakai (id pakai UUID string)

Contoh penyesuaian:

```sql
CREATE TABLE IF NOT EXISTS articles (
  id          VARCHAR(36) PRIMARY KEY,
  slug        VARCHAR(255) NOT NULL UNIQUE,
  title       VARCHAR(500) NOT NULL,
  excerpt     TEXT NOT NULL,
  content     TEXT NOT NULL,
  image       VARCHAR(1024),
  category    VARCHAR(100),
  author      VARCHAR(255),
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Mapping ke Frontend

| Kolom DB        | Field di API / TypeScript |
|-----------------|---------------------------|
| id              | id                        |
| slug            | slug                      |
| title           | title                     |
| excerpt         | excerpt                   |
| content         | content                   |
| image           | image                     |
| category        | category                  |
| author          | author                    |
| published_at    | publishedAt (ISO string)  |
| updated_at      | updatedAt (ISO string)    |

Backend API harus mengembalikan list dan detail dengan format ini agar cocok dengan tipe `Article` / `ArticleDetail` di `src/types/article.ts`.

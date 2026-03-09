-- =============================================================================
-- Schema Database: LMS (Program, Checkout, Enrollment, Payment)
-- =============================================================================
-- Untuk PostgreSQL. Untuk MySQL: ganti TIMESTAMP WITH TIME ZONE → DATETIME,
-- DEFAULT NOW() → CURRENT_TIMESTAMP, BOOLEAN → TINYINT(1), VARCHAR → sesuai.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Users (login/register: siswa & guru)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lms_users (
  id            VARCHAR(36) PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('student', 'instructor')),
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lms_users_email ON lms_users(email);
CREATE INDEX IF NOT EXISTS idx_lms_users_role ON lms_users(role);

-- -----------------------------------------------------------------------------
-- 2. Instructors (profil guru, bisa extend dari lms_users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lms_instructors (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL UNIQUE REFERENCES lms_users(id) ON DELETE CASCADE,
  bio        TEXT,
  avatar_url VARCHAR(1024),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lms_instructors_user ON lms_instructors(user_id);

-- -----------------------------------------------------------------------------
-- 3. Programs (produk yang bisa dibeli/didaftar)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lms_programs (
  id                VARCHAR(36) PRIMARY KEY,
  slug              VARCHAR(255) NOT NULL UNIQUE,
  title             VARCHAR(500) NOT NULL,
  short_description TEXT,
  description       TEXT,
  thumbnail         VARCHAR(1024),
  price             BIGINT NOT NULL DEFAULT 0,
  price_display     VARCHAR(100),
  category          VARCHAR(100),
  level             VARCHAR(50) CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  duration          VARCHAR(100),
  instructor_id     VARCHAR(36) NOT NULL REFERENCES lms_instructors(id) ON DELETE RESTRICT,
  is_published      BOOLEAN NOT NULL DEFAULT true,
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lms_programs_slug ON lms_programs(slug);
CREATE INDEX IF NOT EXISTS idx_lms_programs_published ON lms_programs(is_published);
CREATE INDEX IF NOT EXISTS idx_lms_programs_category ON lms_programs(category);

-- -----------------------------------------------------------------------------
-- 4. Program modules & lessons (outline materi)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lms_program_modules (
  id         VARCHAR(36) PRIMARY KEY,
  program_id VARCHAR(36) NOT NULL REFERENCES lms_programs(id) ON DELETE CASCADE,
  title      VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lms_program_modules_program ON lms_program_modules(program_id);

CREATE TABLE IF NOT EXISTS lms_program_lessons (
  id         VARCHAR(36) PRIMARY KEY,
  module_id  VARCHAR(36) NOT NULL REFERENCES lms_program_modules(id) ON DELETE CASCADE,
  title      VARCHAR(500) NOT NULL,
  duration   VARCHAR(50),
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lms_program_lessons_module ON lms_program_lessons(module_id);

-- -----------------------------------------------------------------------------
-- 5. Orders (keranjang / transaksi)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lms_orders (
  id           VARCHAR(36) PRIMARY KEY,
  user_id      VARCHAR(36) NOT NULL REFERENCES lms_users(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  subtotal     BIGINT NOT NULL DEFAULT 0,
  service_fee  BIGINT NOT NULL DEFAULT 0,
  total        BIGINT NOT NULL DEFAULT 0,
  promo_code   VARCHAR(100),
  discount     BIGINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lms_orders_user ON lms_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_lms_orders_status ON lms_orders(status);

-- -----------------------------------------------------------------------------
-- 6. Order items (satu order bisa 1+ program)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lms_order_items (
  id         VARCHAR(36) PRIMARY KEY,
  order_id   VARCHAR(36) NOT NULL REFERENCES lms_orders(id) ON DELETE CASCADE,
  program_id VARCHAR(36) NOT NULL REFERENCES lms_programs(id) ON DELETE RESTRICT,
  price      BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lms_order_items_order ON lms_order_items(order_id);

-- -----------------------------------------------------------------------------
-- 7. Enrollments (siswa punya akses ke program setelah bayar)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lms_enrollments (
  id              VARCHAR(36) PRIMARY KEY,
  user_id         VARCHAR(36) NOT NULL REFERENCES lms_users(id) ON DELETE CASCADE,
  program_id      VARCHAR(36) NOT NULL REFERENCES lms_programs(id) ON DELETE CASCADE,
  order_id        VARCHAR(36) REFERENCES lms_orders(id) ON DELETE SET NULL,
  progress_percent INT NOT NULL DEFAULT 0,
  enrolled_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, program_id)
);
CREATE INDEX IF NOT EXISTS idx_lms_enrollments_user ON lms_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_lms_enrollments_program ON lms_enrollments(program_id);

-- -----------------------------------------------------------------------------
-- 8. Payments (pembayaran per order, bisa VA / bank / e-wallet)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lms_payments (
  id            VARCHAR(36) PRIMARY KEY,
  order_id      VARCHAR(36) NOT NULL REFERENCES lms_orders(id) ON DELETE CASCADE,
  method        VARCHAR(50) NOT NULL CHECK (method IN ('bank_transfer', 'virtual_account', 'ewallet')),
  external_id   VARCHAR(255),
  gateway_name   VARCHAR(100),
  status        VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  amount        BIGINT NOT NULL,
  paid_at       TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lms_payments_order ON lms_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_lms_payments_external ON lms_payments(external_id);

-- -----------------------------------------------------------------------------
-- 9. Promo codes (kupon diskon)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lms_promo_codes (
  id             VARCHAR(36) PRIMARY KEY,
  code           VARCHAR(100) NOT NULL UNIQUE,
  discount_type   VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percent')),
  discount_value BIGINT NOT NULL,
  valid_from     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMP WITH TIME ZONE,
  max_use        INT,
  use_count      INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lms_promo_codes_code ON lms_promo_codes(code);

-- -----------------------------------------------------------------------------
-- 10. Reviews (ulasan program)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lms_reviews (
  id         VARCHAR(36) PRIMARY KEY,
  program_id VARCHAR(36) NOT NULL REFERENCES lms_programs(id) ON DELETE CASCADE,
  user_id    VARCHAR(36) NOT NULL REFERENCES lms_users(id) ON DELETE CASCADE,
  rating     INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(program_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_lms_reviews_program ON lms_reviews(program_id);

-- -----------------------------------------------------------------------------
-- 11. Certificates (sertifikat selesai program)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lms_certificates (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL REFERENCES lms_users(id) ON DELETE CASCADE,
  program_id VARCHAR(36) NOT NULL REFERENCES lms_programs(id) ON DELETE CASCADE,
  issued_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, program_id)
);
CREATE INDEX IF NOT EXISTS idx_lms_certificates_user ON lms_certificates(user_id);

-- -----------------------------------------------------------------------------
-- 12. Lesson progress (opsional: progress per lesson untuk progress bar)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lms_lesson_progress (
  id         VARCHAR(36) PRIMARY KEY,
  enrollment_id VARCHAR(36) NOT NULL REFERENCES lms_enrollments(id) ON DELETE CASCADE,
  lesson_id  VARCHAR(36) NOT NULL REFERENCES lms_program_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(enrollment_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_lms_lesson_progress_enrollment ON lms_lesson_progress(enrollment_id);

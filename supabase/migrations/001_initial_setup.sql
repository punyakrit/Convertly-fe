-- ============================================
-- Convertly Database Schema
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);

-- Conversions table
CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  input_type TEXT NOT NULL,
  output_type TEXT NOT NULL,
  original_url TEXT,
  converted_url TEXT,
  file_size BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversions_user_id ON conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversions_created_at ON conversions(created_at DESC);

-- ============================================
-- Storage Buckets
-- ============================================
-- Run these in Supabase Dashboard > Storage:
--   1. Create bucket "uploads" (private)
--   2. Create bucket "converted" (public)
--
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('converted', 'converted', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Using service_role key bypasses RLS, but we set policies for safety

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API routes use service_role key)
CREATE POLICY "Service role full access on users"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on conversions"
  ON conversions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Storage policies for converted bucket (public read)
CREATE POLICY "Public read access on converted"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'converted');

CREATE POLICY "Service upload to converted"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'converted');

CREATE POLICY "Service delete from converted"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'converted');

-- Storage policies for uploads bucket
CREATE POLICY "Service upload to uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Service delete from uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'uploads');

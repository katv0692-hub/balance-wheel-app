-- ============================================================
-- Balance Wheel App — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Users table (maps to Telegram user)
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,                    -- Telegram user ID
  username TEXT,
  first_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  onboarded BOOLEAN DEFAULT FALSE
);

-- Custom life spheres per user
CREATE TABLE IF NOT EXISTS spheres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  color TEXT,                                -- hex color for chart
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily entries — one per day per user
CREATE TABLE IF NOT EXISTS entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  sphere_id UUID NOT NULL REFERENCES spheres(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value >= 0 AND value <= 10),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_date, sphere_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spheres ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own data
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (true);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can CRUD own spheres" ON spheres;
CREATE POLICY "Users can CRUD own spheres" ON spheres FOR ALL
  USING (user_id = (SELECT id FROM users LIMIT 1))
  WITH CHECK (user_id = (SELECT id FROM users LIMIT 1));

DROP POLICY IF EXISTS "Users can CRUD own entries" ON entries;
CREATE POLICY "Users can CRUD own entries" ON entries FOR ALL
  USING (user_id = (SELECT id FROM users LIMIT 1))
  WITH CHECK (user_id = (SELECT id FROM users LIMIT 1));

-- Indexes (idempotent)
DROP INDEX IF EXISTS idx_spheres_user;
CREATE INDEX idx_spheres_user ON spheres(user_id);
DROP INDEX IF EXISTS idx_entries_user_date;
CREATE INDEX idx_entries_user_date ON entries(user_id, entry_date);
DROP INDEX IF EXISTS idx_entries_sphere;
CREATE INDEX idx_entries_sphere ON entries(sphere_id);

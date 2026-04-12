-- ============================================
-- Supply Management System - Supabase Schema
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- ============================================
-- MIGRATION: If upgrading from Supabase Auth,
-- run these first to drop the old table:
--   DROP TABLE IF EXISTS user_profiles CASCADE;
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   DROP FUNCTION IF EXISTS public.handle_new_user();
-- ============================================

-- User profiles (standalone, no Supabase Auth dependency)
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- محضر التكعيب شركات (Company Cubic Records)
CREATE TABLE cubic_records (
  id BIGSERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  vehicle_number TEXT NOT NULL,
  cubic_capacity DECIMAL(10,2) NOT NULL,
  location TEXT,
  company_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- بونات (Vouchers)
CREATE TABLE vouchers (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  company_name TEXT NOT NULL,
  tractor_number TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  cubic_capacity DECIMAL(10,2),
  voucher_number TEXT NOT NULL,
  location TEXT,
  material TEXT,
  discount DECIMAL(10,2) DEFAULT 0,
  quarry_name TEXT,
  mashal_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل الدفعات (Payment Records)
CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('driver', 'company', 'quarry')),
  name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- تسعيرة المحاجر (Quarry Pricing)
CREATE TABLE quarry_pricing (
  id BIGSERIAL PRIMARY KEY,
  quarry_name TEXT NOT NULL,
  material TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- مصروفات (Expenses)
CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  item TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- مقاولين النقل (Transport Contractors)
CREATE TABLE transport_contractors (
  id BIGSERIAL PRIMARY KEY,
  driver_name TEXT NOT NULL,
  tractor_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Enable Row Level Security
-- ============================================
-- user_profiles: NO anon policies — only accessible via service role key in API routes
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Data tables: allow anon role (frontend Supabase client uses anon key)
-- App-level auth (JWT) gates the dashboard UI
ALTER TABLE cubic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarry_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_contractors ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - Read access for anon (frontend)
-- ============================================
CREATE POLICY "anon_read" ON cubic_records FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON vouchers FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON payments FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON quarry_pricing FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON expenses FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON transport_contractors FOR SELECT TO anon USING (true);

-- ============================================
-- RLS Policies - Insert for anon (frontend)
-- ============================================
CREATE POLICY "anon_insert" ON cubic_records FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert" ON vouchers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert" ON payments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert" ON quarry_pricing FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert" ON expenses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert" ON transport_contractors FOR INSERT TO anon WITH CHECK (true);

-- ============================================
-- RLS Policies - Update for anon (frontend)
-- ============================================
CREATE POLICY "anon_update" ON cubic_records FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_update" ON vouchers FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_update" ON payments FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_update" ON quarry_pricing FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_update" ON expenses FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_update" ON transport_contractors FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ============================================
-- RLS Policies - Delete for anon (frontend)
-- ============================================
CREATE POLICY "anon_delete" ON cubic_records FOR DELETE TO anon USING (true);
CREATE POLICY "anon_delete" ON vouchers FOR DELETE TO anon USING (true);
CREATE POLICY "anon_delete" ON payments FOR DELETE TO anon USING (true);
CREATE POLICY "anon_delete" ON quarry_pricing FOR DELETE TO anon USING (true);
CREATE POLICY "anon_delete" ON expenses FOR DELETE TO anon USING (true);
CREATE POLICY "anon_delete" ON transport_contractors FOR DELETE TO anon USING (true);

-- ============================================
-- Create the first admin user (run after setup)
-- Replace with real values and a bcrypt hash of the password.
-- You can generate one at: https://bcrypt-generator.com/ (cost 12)
-- ============================================
-- INSERT INTO user_profiles (username, password_hash, full_name, role)
-- VALUES ('admin', '$2a$12$...your_bcrypt_hash...', 'المدير', 'admin');

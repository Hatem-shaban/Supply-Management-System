-- ============================================
-- Supply Management System - Supabase Schema
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- User profiles (extends Supabase Auth)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  full_name TEXT,
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
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cubic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarry_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_contractors ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - Read access for authenticated
-- ============================================
CREATE POLICY "auth_read" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON cubic_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON vouchers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON quarry_pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON transport_contractors FOR SELECT TO authenticated USING (true);

-- ============================================
-- RLS Policies - Insert for authenticated
-- ============================================
CREATE POLICY "auth_insert" ON cubic_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_insert" ON vouchers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_insert" ON payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_insert" ON quarry_pricing FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_insert" ON transport_contractors FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- RLS Policies - Delete for authenticated
-- ============================================
CREATE POLICY "auth_delete" ON cubic_records FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_delete" ON vouchers FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_delete" ON payments FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_delete" ON quarry_pricing FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_delete" ON expenses FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_delete" ON transport_contractors FOR DELETE TO authenticated USING (true);

-- ============================================
-- Auto-create user profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, full_name)
  VALUES (NEW.id, 'user', NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- To make first user admin, run:
-- UPDATE user_profiles SET role = 'admin' WHERE id = 'USER_UUID_HERE';
-- ============================================

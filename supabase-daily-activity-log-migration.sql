-- ============================================
-- Daily Activity Log Migration
-- Run this once in Supabase SQL Editor for an existing project.
-- ============================================

CREATE TABLE IF NOT EXISTS daily_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  activity_date DATE NOT NULL UNIQUE,
  voucher_count INTEGER NOT NULL DEFAULT 0 CHECK (voucher_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE daily_activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_activity_logs'
      AND policyname = 'anon_read'
  ) THEN
    CREATE POLICY "anon_read" ON daily_activity_logs FOR SELECT TO anon USING (true);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_daily_voucher_activity(target_date DATE)
RETURNS daily_activity_logs
LANGUAGE plpgsql
AS $$
DECLARE
  logged_row daily_activity_logs;
  day_start TIMESTAMPTZ;
  day_end TIMESTAMPTZ;
BEGIN
  IF target_date IS NULL THEN
    RAISE EXCEPTION 'target_date is required';
  END IF;

  day_start := target_date::timestamp AT TIME ZONE 'Africa/Cairo';
  day_end := (target_date + 1)::timestamp AT TIME ZONE 'Africa/Cairo';

  INSERT INTO daily_activity_logs (activity_date, voucher_count, updated_at)
  SELECT
    target_date,
    COUNT(*)::INTEGER,
    NOW()
  FROM vouchers
  WHERE created_at >= day_start
    AND created_at < day_end
  ON CONFLICT (activity_date) DO UPDATE
    SET voucher_count = EXCLUDED.voucher_count,
        updated_at = NOW()
  RETURNING * INTO logged_row;

  RETURN logged_row;
END;
$$;

-- ============================================================
-- Hotfix: Extend check_in_method ENUM + add pass_code column
-- Run this on your EXISTING database (no data loss).
-- ============================================================

USE society_management;

-- 1. Add permanent_pass to the check_in_method ENUM
ALTER TABLE staff_attendance
  MODIFY COLUMN check_in_method
    ENUM('qr', 'manual', 'guard', 'secure_gate_otp', 'permanent_pass')
    DEFAULT 'manual';

-- 2. Add pass_code to domestic_staff (if not already added)
ALTER TABLE domestic_staff
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT TRUE       AFTER photo_url,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE      AFTER is_active,
  ADD COLUMN IF NOT EXISTS pass_code   VARCHAR(10) NULL DEFAULT NULL AFTER is_verified;

-- 3. Backfill pass codes for any existing staff that don't have one
UPDATE domestic_staff
SET pass_code = UPPER(SUBSTRING(REPLACE(REPLACE(UUID(),'-',''),'0','X'), 1, 6))
WHERE pass_code IS NULL AND is_active = TRUE;

-- ============================================================
-- Done. Restart your API server.
-- ============================================================

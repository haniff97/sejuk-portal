-- ============================================================
-- Migration: Add technician completion & payment fields
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. technician_name: who completed the job (stored explicitly on the record)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS technician_name TEXT;

-- 2. completed_at: exact timestamp when technician marked job done
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 3. payment_received: amount paid by customer on-site (optional)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_received NUMERIC(10, 2);

-- 4. payment_method: e.g. "Cash", "Online Transfer", etc. (optional)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 5. payment_receipt_url: uploaded receipt photo/PDF URL (optional)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;

-- ============================================================
-- Verify columns were added:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'orders' ORDER BY ordinal_position;
-- ============================================================

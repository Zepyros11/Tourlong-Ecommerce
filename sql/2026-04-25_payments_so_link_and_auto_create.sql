-- ============================================================
-- Migration: 2026-04-25
-- Purpose: เชื่อม Payments กับ SO/PO + auto-create เมื่อ approved/completed
-- Run in: Supabase SQL Editor
-- ============================================================

-- 1. Add columns to payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS so_id BIGINT REFERENCES sales_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN payments.so_id IS 'FK to sales_orders (incoming เคส SO ตรงๆ ไม่ผ่าน Invoice)';
COMMENT ON COLUMN payments.source IS 'manual (admin สร้างเอง) | so (auto จาก SO completed) | po (auto จาก PO approved)';

CREATE INDEX IF NOT EXISTS idx_payments_so_id ON payments(so_id);
CREATE INDEX IF NOT EXISTS idx_payments_source ON payments(source);

-- 2. Helper: generate next payment_number (PAY-YYYY-NNN format, 3-digit padded)
CREATE OR REPLACE FUNCTION next_payment_number()
RETURNS TEXT AS $$
DECLARE
  yr TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  prefix TEXT;
  max_num INT;
BEGIN
  prefix := 'PAY-' || yr || '-';
  SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(SUBSTRING(payment_number FROM LENGTH(prefix) + 1), '\D', '', 'g'), '')::INT), 0)
    INTO max_num
    FROM payments
   WHERE payment_number LIKE prefix || '%';
  RETURN prefix || LPAD((max_num + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger: SO completed → auto-create Payment incoming (pending)
CREATE OR REPLACE FUNCTION auto_payment_from_so()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create เมื่อ status เปลี่ยนเป็น completed (ครั้งแรก)
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    -- Skip ถ้ามี Payment auto-created อยู่แล้ว (กัน duplicate ตอน toggle status ไปกลับ)
    IF NOT EXISTS (
      SELECT 1 FROM payments
       WHERE so_id = NEW.id AND source = 'so' AND status <> 'cancelled'
    ) THEN
      INSERT INTO payments (
        payment_number, date, direction, so_id, customer_id,
        amount, status, method, source, note
      ) VALUES (
        next_payment_number(), CURRENT_DATE, 'incoming', NEW.id, NEW.customer_id,
        NEW.total, 'pending', 'โอนธนาคาร', 'so',
        'Auto-created from SO ' || COALESCE(NEW.so_number, NEW.id::TEXT)
      );
    END IF;
  END IF;

  -- Auto-cancel pending payment เมื่อ SO เปลี่ยนเป็น cancelled
  -- (completed payments ไม่แตะ — ต้องให้ admin ตัดสินใจคืนเงินเอง)
  IF NEW.status = 'cancelled' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'cancelled') THEN
    UPDATE payments
       SET status = 'cancelled',
           note = COALESCE(note, '') || ' [auto-cancelled: SO cancelled]'
     WHERE so_id = NEW.id AND source = 'so' AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_so_auto_payment ON sales_orders;
CREATE TRIGGER trg_so_auto_payment
AFTER INSERT OR UPDATE OF status ON sales_orders
FOR EACH ROW EXECUTE FUNCTION auto_payment_from_so();

-- 4. Trigger: PO approved → auto-create Payment outgoing (pending)
CREATE OR REPLACE FUNCTION auto_payment_from_po()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    IF NOT EXISTS (
      SELECT 1 FROM payments
       WHERE po_id = NEW.id AND source = 'po' AND status <> 'cancelled'
    ) THEN
      INSERT INTO payments (
        payment_number, date, direction, po_id, supplier_id,
        amount, status, method, source, note
      ) VALUES (
        next_payment_number(), CURRENT_DATE, 'outgoing', NEW.id, NEW.supplier_id,
        NEW.total, 'pending', 'โอนธนาคาร', 'po',
        'Auto-created from PO ' || COALESCE(NEW.po_number, NEW.id::TEXT)
      );
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'cancelled') THEN
    UPDATE payments
       SET status = 'cancelled',
           note = COALESCE(note, '') || ' [auto-cancelled: PO cancelled]'
     WHERE po_id = NEW.id AND source = 'po' AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_po_auto_payment ON purchase_orders;
CREATE TRIGGER trg_po_auto_payment
AFTER INSERT OR UPDATE OF status ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION auto_payment_from_po();

-- ============================================================
-- VERIFY (run separately to check)
-- ============================================================
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'payments' AND column_name IN ('so_id', 'source');
--
-- SELECT trigger_name, event_object_table
--   FROM information_schema.triggers
--  WHERE trigger_name IN ('trg_so_auto_payment', 'trg_po_auto_payment');

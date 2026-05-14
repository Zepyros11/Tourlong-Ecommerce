-- ============================================================
-- Migration: 2026-05-05
-- Purpose:
--   1) สร้าง app_settings (key-value) สำหรับเก็บ toggle/policy ที่เคยอยู่ localStorage
--   2) Auto-create Invoice เมื่อ SO completed (สอดคล้องกับ payment auto-create)
--   3) Auto-cancel Invoice เมื่อ SO cancelled
--   4) Verify/Add FK ON DELETE สำหรับ orphan-record protection
-- Run in: Supabase SQL Editor
--
-- Idempotent — guard ด้วย IF EXISTS ทุกส่วน → รันใน branch ที่ table ยังไม่ครบก็ได้
-- (จะ skip ส่วนที่ table ยังไม่มี ไม่ throw error)
-- ============================================================

-- ============================================================
-- 1. app_settings table (key-value, JSONB value)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION app_settings_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON app_settings;
CREATE TRIGGER trg_app_settings_updated_at
BEFORE UPDATE ON app_settings
FOR EACH ROW EXECUTE FUNCTION app_settings_set_updated_at();

-- RLS: dev-only allow_all_anon (เหมือน table อื่น)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anon ON app_settings;
CREATE POLICY allow_all_anon ON app_settings FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Helper: generate next invoice_number (INV-YYYY-NNN)
--    Skip ถ้า invoices ไม่มีใน branch นี้
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION next_invoice_number()
      RETURNS TEXT AS $body$
      DECLARE
        yr TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
        prefix TEXT;
        max_num INT;
      BEGIN
        prefix := 'INV-' || yr || '-';
        SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(SUBSTRING(invoice_number FROM LENGTH(prefix) + 1), '\D', '', 'g'), '')::INT), 0)
          INTO max_num
          FROM invoices
         WHERE invoice_number LIKE prefix || '%';
        RETURN prefix || LPAD((max_num + 1)::TEXT, 3, '0');
      END;
      $body$ LANGUAGE plpgsql;
    $f$;
  ELSE
    RAISE NOTICE 'Skipped next_invoice_number(): table "invoices" not found in this branch';
  END IF;
END $$;

-- ============================================================
-- 3. Trigger: SO completed → auto-create Invoice (status=unpaid)
--    SO cancelled → auto-cancel linked Invoice
--    Skip ถ้า sales_orders/invoices ไม่มี
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sales_orders') THEN

    EXECUTE $f$
      CREATE OR REPLACE FUNCTION auto_invoice_from_so()
      RETURNS TRIGGER AS $body$
      BEGIN
        IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
          IF NOT EXISTS (
            SELECT 1 FROM invoices
             WHERE so_id = NEW.id AND status <> 'cancelled'
          ) THEN
            INSERT INTO invoices (
              invoice_number, so_id, customer_id, date, due_date, amount, status, note
            ) VALUES (
              next_invoice_number(),
              NEW.id,
              NEW.customer_id,
              CURRENT_DATE,
              CURRENT_DATE + INTERVAL '30 days',
              NEW.total,
              'unpaid',
              'Auto-created from SO ' || COALESCE(NEW.so_number, NEW.id::TEXT)
            );
          END IF;
        END IF;

        IF NEW.status = 'cancelled' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'cancelled') THEN
          UPDATE invoices
             SET status = 'cancelled',
                 note = COALESCE(note, '') || ' [auto-cancelled: SO cancelled]'
           WHERE so_id = NEW.id AND status <> 'cancelled';
        END IF;

        RETURN NEW;
      END;
      $body$ LANGUAGE plpgsql;
    $f$;

    DROP TRIGGER IF EXISTS trg_so_auto_invoice ON sales_orders;
    CREATE TRIGGER trg_so_auto_invoice
    AFTER INSERT OR UPDATE OF status ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION auto_invoice_from_so();
  ELSE
    RAISE NOTICE 'Skipped trg_so_auto_invoice: invoices/sales_orders not found in this branch';
  END IF;
END $$;

-- ============================================================
-- 4. FK orphan protection (idempotent + guard)
-- ============================================================
DO $$
BEGIN
  -- invoices.so_id → sales_orders(id) ON DELETE SET NULL
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sales_orders')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
        WHERE table_name='invoices' AND constraint_name='invoices_so_id_fkey'
     ) THEN
    BEGIN
      ALTER TABLE invoices
        ADD CONSTRAINT invoices_so_id_fkey
        FOREIGN KEY (so_id) REFERENCES sales_orders(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- invoices.customer_id → customers(id) ON DELETE SET NULL
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='customers')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
        WHERE table_name='invoices' AND constraint_name='invoices_customer_id_fkey'
     ) THEN
    BEGIN
      ALTER TABLE invoices
        ADD CONSTRAINT invoices_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================
-- VERIFY (run separately to check)
-- ============================================================
-- SELECT * FROM app_settings;
--
-- SELECT trigger_name, event_object_table
--   FROM information_schema.triggers
--  WHERE trigger_name = 'trg_so_auto_invoice';
--
-- -- ดู NOTICE messages: View → Output panel หลังรัน (RAISE NOTICE จะแสดงที่นั่น)

-- ============================================================================
-- L'ASADOR | SAFE TABLE DELETION & REALTIME ALARM FOUNDATION
-- Location: Sector 82, Mohali, Punjab | Single Restaurant Operations
--
-- 1. Adds deleted_at to dining_tables for safe archival preserving historical bills/orders.
-- 2. Creates service_requests table for table calls and enquiries.
-- 3. Enables Supabase Realtime publication for orders and service_requests.
-- ============================================================================

-- 1. Safe Dining Table Deletion: Add deleted_at column
ALTER TABLE dining_tables ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_dining_tables_deleted_at ON dining_tables(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON COLUMN dining_tables.deleted_at IS 'Timestamp when the table was archived/soft-deleted. Preserves relational integrity for historical orders and bills.';

-- 2. Guest Service Requests & Enquiries Table
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES dining_tables(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL DEFAULT 'waiter' CHECK (request_type IN ('waiter', 'water', 'bill', 'enquiry', 'urgent')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_table ON service_requests(table_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created ON service_requests(created_at DESC);

-- RLS for service_requests
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Staff can view and manage all service requests
CREATE POLICY "Staff can view all service requests"
  ON service_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can update service requests"
  ON service_requests FOR UPDATE
  TO authenticated
  USING (true);

-- Public (guests at tables) can insert service requests
CREATE POLICY "Guests can insert service requests"
  ON service_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 3. Enable Supabase Realtime publication for orders and service_requests
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'service_requests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
    END IF;
  END IF;
END $$;

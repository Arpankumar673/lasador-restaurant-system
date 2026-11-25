-- ============================================================================
-- L'ASADOR | SCAN COUNTDOWN & ORDER-TRIGGERED DEVICE LOCK SYSTEM
-- Location: Sector 82, Mohali, Punjab | Single Restaurant Operations
--
-- 1. Adds qr_scan_countdown_seconds to restaurant_settings (default 300s = 5 mins).
-- 2. Adds session_device_hash, hold_expires_at, and is_order_locked to table_sessions.
-- 3. Enables secure device-level session locking and auto-expiring browsing holds.
-- ============================================================================

-- 1. Configurable QR Scan Countdown in restaurant_settings
ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS qr_scan_countdown_seconds INTEGER NOT NULL DEFAULT 300;

COMMENT ON COLUMN restaurant_settings.qr_scan_countdown_seconds IS
  'Browsing hold duration in seconds (default 300s / 5 mins) before an un-ordered table session expires and frees the table.';

-- 2. Device Hash, Countdown Expiration & Order Lock on table_sessions
ALTER TABLE table_sessions
  ADD COLUMN IF NOT EXISTS session_device_hash TEXT,
  ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_order_locked BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_table_sessions_device_hash
  ON table_sessions(session_device_hash)
  WHERE session_device_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_table_sessions_hold_expires_at
  ON table_sessions(hold_expires_at)
  WHERE hold_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_table_sessions_order_locked
  ON table_sessions(is_order_locked);

COMMENT ON COLUMN table_sessions.session_device_hash IS
  'Cryptographic SHA-256 hash of the guest device token holding or owning this table session.';

COMMENT ON COLUMN table_sessions.hold_expires_at IS
  'Timestamp when the exclusive browsing hold expires if no initial order is placed.';

COMMENT ON COLUMN table_sessions.is_order_locked IS
  'True once an initial order has been submitted by the holding device, permanently locking the session to that customer until bill settlement.';

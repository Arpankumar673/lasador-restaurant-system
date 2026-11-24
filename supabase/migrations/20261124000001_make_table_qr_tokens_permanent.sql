-- ============================================================================
-- L'ASADOR | TABLE QR TOKEN PERMANENT LIFECYCLE MIGRATION
-- Location: Sector 82, Mohali, Punjab | Single Restaurant Operations
--
-- Ensures table QR codes remain valid permanently until an administrator
-- explicitly revokes or rotates them. Enforces that expires_at is nullable,
-- has NO default expiration timestamp/TTL, and adds raw_token storage for
-- full lifecycle view, print, and audit capability.
-- ============================================================================

-- 1. Ensure expires_at is nullable and has NO default time-based expiration
ALTER TABLE table_qr_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE table_qr_tokens ALTER COLUMN expires_at DROP DEFAULT;
ALTER TABLE table_qr_tokens ALTER COLUMN expires_at DROP NOT NULL;

-- 2. Add raw_token column so staff can view and print the exact table QR code at any time
ALTER TABLE table_qr_tokens ADD COLUMN IF NOT EXISTS raw_token TEXT DEFAULT NULL;

-- 3. Optional index on raw_token for fast lookup when customer scans
CREATE INDEX IF NOT EXISTS idx_table_qr_tokens_raw_token
  ON table_qr_tokens(raw_token)
  WHERE raw_token IS NOT NULL;

-- 4. Reset any existing active tokens so expires_at is strictly NULL (permanent validity)
UPDATE table_qr_tokens
SET expires_at = NULL
WHERE is_active = true AND revoked_at IS NULL;

-- 5. Clear documentation of permanent lifecycle guarantee
COMMENT ON TABLE table_qr_tokens IS 'Table QR tokens for L''Asador dining tables. Tokens remain permanently valid until explicitly rotated or revoked by staff. Zero automatic time-based expiry.';
COMMENT ON COLUMN table_qr_tokens.expires_at IS 'Optional timestamp if manual temporary testing is ever configured. NULL indicates permanent validity until explicit revocation.';
COMMENT ON COLUMN table_qr_tokens.raw_token IS 'Optional storage of the plaintext token so authorized staff can view, export SVG, or print physical QR stands without rotating the active token.';

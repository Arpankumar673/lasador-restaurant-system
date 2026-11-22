-- ==============================================================================
-- L'ASADOR – GRILL & BREW | INDEPENDENT SUPABASE FOUNDATION
-- Migration: 20261119000000_phase1_initial_setup.sql
-- Scope: Phase 1 Technical Foundation Setup
-- Location: Mohali, Punjab
-- ==============================================================================
-- IMPORTANT ARCHITECTURAL CONSTRAINTS:
-- 1. This database is strictly for L'Asador – Grill & Brew.
-- 2. Single-restaurant architecture. DO NOT add tenant_id or multi-tenant logic.
-- 3. Core tables (profiles, menu, tables, orders, KDS tickets, bills) will be
--    introduced in Phase 2 with strict Row Level Security (RLS) policies.
-- ==============================================================================

-- Enable foundational cryptographic & UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set default timezone to Indian Standard Time (IST / Asia/Kolkata)
-- L'Asador operates in Mohali, Punjab
ALTER DATABASE postgres SET timezone TO 'Asia/Kolkata';

-- Comment marking initial database foundation readiness
COMMENT ON SCHEMA public IS 'L''Asador – Grill & Brew Dedicated Public Schema';

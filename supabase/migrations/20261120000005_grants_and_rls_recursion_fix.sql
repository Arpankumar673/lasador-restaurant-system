-- ==============================================================================
-- L'ASADOR – GRILL & BREW | INDEPENDENT SUPABASE FOUNDATION
-- Migration: 20261120000005_grants_and_rls_recursion_fix.sql
-- Scope: PostgREST Schema Grants & RLS Recursion Prevention
-- Single Restaurant Architecture (Mohali, Punjab)
-- ==============================================================================

-- 1. Grant PostgREST schema and object permissions
-- In Supabase, the API roles (anon, authenticated, service_role) must be granted
-- schema usage and table privileges before PostgREST evaluates RLS policies.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Fix Potential RLS Recursion on profiles
-- The subquery in the self-update policy `(SELECT p.role FROM profiles p WHERE p.id = auth.uid())`
-- queries public.profiles during an UPDATE on public.profiles.
-- To completely eliminate RLS recursion while strictly preserving role security,
-- we define a SECURITY DEFINER function with a pinned search_path.

CREATE OR REPLACE FUNCTION get_profile_role(user_id UUID)
RETURNS staff_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Revoke public execution and allow authenticated/service_role
REVOKE EXECUTE ON FUNCTION get_profile_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_profile_role(UUID) TO authenticated, service_role;

-- Replace the self-update policy with the non-recursive helper
DROP POLICY IF EXISTS "Staff can update own profile contact info without role escalation" ON profiles;

CREATE POLICY "Staff can update own profile contact info without role escalation"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = get_profile_role(auth.uid())
  );

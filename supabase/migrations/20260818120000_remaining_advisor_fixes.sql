-- =====================================================
-- Migration: Fix has_role EXECUTE permission for authenticated
-- Date: 2026-08-18
-- Idempotent: safe to run multiple times
-- =====================================================
-- The original 20260610120000_fix_security_warnings.sql revoked
-- EXECUTE from PUBLIC, which also removed it from authenticated.
-- This broke ALL RLS policies that call has_role() for
-- authenticated users, causing empty data on all admin pages.

-- 1. Grant EXECUTE on has_role to authenticated
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 2. Ensure handle_new_user is callable by service_role
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 3. Drop broad public SELECT policies on storage buckets
-- (these were created by mistake in 20260818000000)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'assinaturas') THEN
    DROP POLICY IF EXISTS "assinaturas_select_public" ON storage.objects;
    DROP POLICY IF EXISTS "assinaturas_public_read" ON storage.objects;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
    DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
  END IF;
END $$;

-- =====================================================
-- NOTE: pg_net extension warning cannot be fixed
-- (Supabase limitation)
--
-- NOTE: auth_leaked_password_protection must be enabled
-- manually in Supabase Dashboard > Auth > Providers > Password
-- =====================================================

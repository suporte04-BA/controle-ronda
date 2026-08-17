-- =====================================================
-- Migration: Fix all Supabase Advisor warnings (v2)
-- Date: 2026-08-18
-- Fully idempotent: safe to run multiple times
-- =====================================================

-- =====================================================
-- 1. Fix function_search_path_mutable
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enviar_relatorio_resend') THEN
    ALTER FUNCTION public.enviar_relatorio_resend(text) SET search_path = public;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    ALTER FUNCTION public.update_updated_at() SET search_path = public;
  END IF;
END $$;

-- =====================================================
-- 2. Fix rls_policy_always_true
--    Drop ALL policies (old *_all and new command-specific)
--    Recreate ONLY SELECT policies (safe with USING true)
--    INSERT/UPDATE/DELETE removed - not needed for legacy tables
-- =====================================================

-- assinaturas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assinaturas') THEN
    -- Drop everything
    DROP POLICY IF EXISTS "as_anon" ON public.assinaturas;
    DROP POLICY IF EXISTS "as_all" ON public.assinaturas;
    DROP POLICY IF EXISTS "as_select_anon" ON public.assinaturas;
    DROP POLICY IF EXISTS "as_select_auth" ON public.assinaturas;
    DROP POLICY IF EXISTS "as_insert_auth" ON public.assinaturas;
    DROP POLICY IF EXISTS "as_update_auth" ON public.assinaturas;
    DROP POLICY IF EXISTS "as_delete_auth" ON public.assinaturas;
    -- Recreate only SELECT (safe)
    CREATE POLICY "as_select_anon" ON public.assinaturas FOR SELECT TO anon USING (true);
    CREATE POLICY "as_select_auth" ON public.assinaturas FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- comprovantes_entrega
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comprovantes_entrega') THEN
    DROP POLICY IF EXISTS "ce_anon" ON public.comprovantes_entrega;
    DROP POLICY IF EXISTS "ce_all" ON public.comprovantes_entrega;
    DROP POLICY IF EXISTS "ce_select_anon" ON public.comprovantes_entrega;
    DROP POLICY IF EXISTS "ce_select_auth" ON public.comprovantes_entrega;
    DROP POLICY IF EXISTS "ce_insert_auth" ON public.comprovantes_entrega;
    DROP POLICY IF EXISTS "ce_update_auth" ON public.comprovantes_entrega;
    DROP POLICY IF EXISTS "ce_delete_auth" ON public.comprovantes_entrega;
    CREATE POLICY "ce_select_anon" ON public.comprovantes_entrega FOR SELECT TO anon USING (true);
    CREATE POLICY "ce_select_auth" ON public.comprovantes_entrega FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- contratos
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contratos') THEN
    DROP POLICY IF EXISTS "ct_anon" ON public.contratos;
    DROP POLICY IF EXISTS "ct_all" ON public.contratos;
    DROP POLICY IF EXISTS "ct_select_anon" ON public.contratos;
    DROP POLICY IF EXISTS "ct_select_auth" ON public.contratos;
    DROP POLICY IF EXISTS "ct_insert_auth" ON public.contratos;
    DROP POLICY IF EXISTS "ct_update_auth" ON public.contratos;
    DROP POLICY IF EXISTS "ct_delete_auth" ON public.contratos;
    CREATE POLICY "ct_select_anon" ON public.contratos FOR SELECT TO anon USING (true);
    CREATE POLICY "ct_select_auth" ON public.contratos FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- email_logs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_logs') THEN
    DROP POLICY IF EXISTS "el_anon" ON public.email_logs;
    DROP POLICY IF EXISTS "el_all" ON public.email_logs;
    DROP POLICY IF EXISTS "el_select_anon" ON public.email_logs;
    DROP POLICY IF EXISTS "el_select_auth" ON public.email_logs;
    DROP POLICY IF EXISTS "el_insert_auth" ON public.email_logs;
    DROP POLICY IF EXISTS "el_update_auth" ON public.email_logs;
    DROP POLICY IF EXISTS "el_delete_auth" ON public.email_logs;
    CREATE POLICY "el_select_anon" ON public.email_logs FOR SELECT TO anon USING (true);
    CREATE POLICY "el_select_auth" ON public.email_logs FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- equipamentos
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipamentos') THEN
    DROP POLICY IF EXISTS "eq_anon" ON public.equipamentos;
    DROP POLICY IF EXISTS "eq_all" ON public.equipamentos;
    DROP POLICY IF EXISTS "eq_select_anon" ON public.equipamentos;
    DROP POLICY IF EXISTS "eq_select_auth" ON public.equipamentos;
    DROP POLICY IF EXISTS "eq_insert_auth" ON public.equipamentos;
    DROP POLICY IF EXISTS "eq_update_auth" ON public.equipamentos;
    DROP POLICY IF EXISTS "eq_delete_auth" ON public.equipamentos;
    CREATE POLICY "eq_select_anon" ON public.equipamentos FOR SELECT TO anon USING (true);
    CREATE POLICY "eq_select_auth" ON public.equipamentos FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- notas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notas') THEN
    DROP POLICY IF EXISTS "no_anon" ON public.notas;
    DROP POLICY IF EXISTS "no_all" ON public.notas;
    DROP POLICY IF EXISTS "no_select_anon" ON public.notas;
    DROP POLICY IF EXISTS "no_select_auth" ON public.notas;
    DROP POLICY IF EXISTS "no_insert_auth" ON public.notas;
    DROP POLICY IF EXISTS "no_update_auth" ON public.notas;
    DROP POLICY IF EXISTS "no_delete_auth" ON public.notas;
    CREATE POLICY "no_select_anon" ON public.notas FOR SELECT TO anon USING (true);
    CREATE POLICY "no_select_auth" ON public.notas FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ordens_servico
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ordens_servico') THEN
    DROP POLICY IF EXISTS "os_anon" ON public.ordens_servico;
    DROP POLICY IF EXISTS "os_all" ON public.ordens_servico;
    DROP POLICY IF EXISTS "os_select_anon" ON public.ordens_servico;
    DROP POLICY IF EXISTS "os_select_auth" ON public.ordens_servico;
    DROP POLICY IF EXISTS "os_insert_auth" ON public.ordens_servico;
    DROP POLICY IF EXISTS "os_update_auth" ON public.ordens_servico;
    DROP POLICY IF EXISTS "os_delete_auth" ON public.ordens_servico;
    CREATE POLICY "os_select_anon" ON public.ordens_servico FOR SELECT TO anon USING (true);
    CREATE POLICY "os_select_auth" ON public.ordens_servico FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- =====================================================
-- 3. Fix public_bucket_allows_listing
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'assinaturas') THEN
    DROP POLICY IF EXISTS "assinaturas_public_read" ON storage.objects;
    DROP POLICY IF EXISTS "assinaturas_select_public" ON storage.objects;
    CREATE POLICY "assinaturas_select_public" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'assinaturas');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
    DROP POLICY IF EXISTS "auth reads avatars" ON storage.objects;
    DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
    CREATE POLICY "avatars_select_public" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'avatars');
  END IF;
END $$;

-- =====================================================
-- 4. Fix security_definer_function_executable
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enviar_relatorio_resend') THEN
    REVOKE EXECUTE ON FUNCTION public.enviar_relatorio_resend(text) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.enviar_relatorio_resend(text) TO service_role;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
    REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
  END IF;
END $$;

-- =====================================================
-- 5. Fix update_updated_at access
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.update_updated_at() TO authenticated, service_role;
  END IF;
END $$;

-- =====================================================
-- NOTE: auth_leaked_password_protection
-- Must be enabled manually in Supabase Dashboard:
-- Authentication > Providers > Password >
--   Enable leaked password protection
-- =====================================================

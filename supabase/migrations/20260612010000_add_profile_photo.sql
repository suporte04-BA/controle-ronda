-- =====================================================
-- Migration: Foto de perfil do usuário
-- Adiciona coluna foto_url em profiles + bucket avatars
-- Idempotente: pode rodar várias vezes sem erro
-- =====================================================

-- 1. Adicionar coluna foto_url na tabela profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'foto_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN foto_url TEXT;
  END IF;
END $$;

-- 2. Garantir bucket avatars (público para leitura de fotos de perfil)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES para bucket avatars
-- =====================================================

-- SELECT: qualquer autenticado lê (para ver foto de outros usuários)
DROP POLICY IF EXISTS "auth reads avatars" ON storage.objects;
CREATE POLICY "auth reads avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

-- INSERT: usuário autenticado faz upload na própria pasta {user_id}/
DROP POLICY IF EXISTS "auth uploads own avatar" ON storage.objects;
CREATE POLICY "auth uploads own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- UPDATE: usuário atualiza a própria foto; admin atualiza qualquer uma
DROP POLICY IF EXISTS "user updates own avatar or admin" ON storage.objects;
CREATE POLICY "user updates own avatar or admin" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- DELETE: usuário deleta a própria foto; admin deleta qualquer uma
DROP POLICY IF EXISTS "user deletes own avatar or admin" ON storage.objects;
CREATE POLICY "user deletes own avatar or admin" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

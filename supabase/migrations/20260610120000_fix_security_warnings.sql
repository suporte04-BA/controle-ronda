-- =====================================================
-- Migration: Correção completa de segurança
-- Idempotente: pode rodar várias vezes sem erro
-- =====================================================

-- 0. Garantir tipos enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_acao_ponto') THEN
    CREATE TYPE public.tipo_acao_ponto AS ENUM ('check_in', 'check_out_1', 'check_out_2');
  END IF;
END $$;

-- 1. Garantir que tabelas existem
CREATE TABLE IF NOT EXISTS public.setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.registros_ponto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_acao public.tipo_acao_ponto NOT NULL,
  horario_acao TIMESTAMPTZ NOT NULL,
  horario_foto TIMESTAMPTZ NOT NULL DEFAULT now(),
  foto_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registros_user_created ON public.registros_ponto(user_id, created_at DESC);

-- 2. Garantir RLS habilitado
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;

-- 3. Garantir GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setores TO authenticated;
GRANT ALL ON public.setores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_ponto TO authenticated;
GRANT ALL ON public.registros_ponto TO service_role;

-- 4. Recriar has_role (DROP + CREATE para garantir assinatura correta)
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role) CASCADE;
CREATE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Recriar handle_new_user
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- 6. Revogar EXECUTE para PUBLIC/anon
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 7. Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- POLICIES (DROP + CREATE para idempotência)
-- Todas usam 'admin'::public.app_role (cast explícito)
-- =====================================================

-- Setores
DROP POLICY IF EXISTS "auth read setores" ON public.setores;
CREATE POLICY "auth read setores" ON public.setores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin manage setores" ON public.setores;
CREATE POLICY "admin manage setores" ON public.setores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Profiles
DROP POLICY IF EXISTS "user reads own profile" ON public.profiles;
CREATE POLICY "user reads own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "user updates own profile" ON public.profiles;
CREATE POLICY "user updates own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin inserts profile" ON public.profiles;
CREATE POLICY "admin inserts profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin deletes profile" ON public.profiles;
CREATE POLICY "admin deletes profile" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- User roles
DROP POLICY IF EXISTS "read own role" ON public.user_roles;
CREATE POLICY "read own role" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manages roles" ON public.user_roles;
CREATE POLICY "admin manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "only admin inserts roles" ON public.user_roles;
CREATE POLICY "only admin inserts roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "only admin updates roles" ON public.user_roles;
CREATE POLICY "only admin updates roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "only admin deletes roles" ON public.user_roles;
CREATE POLICY "only admin deletes roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Registros
DROP POLICY IF EXISTS "user reads own registros" ON public.registros_ponto;
CREATE POLICY "user reads own registros" ON public.registros_ponto FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "user inserts own registro" ON public.registros_ponto;
CREATE POLICY "user inserts own registro" ON public.registros_ponto FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin manages registros" ON public.registros_ponto;
CREATE POLICY "admin manages registros" ON public.registros_ponto FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin deletes registros" ON public.registros_ponto;
CREATE POLICY "admin deletes registros" ON public.registros_ponto FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =====================================================
-- STORAGE: bucket fotos_ponto
-- =====================================================

-- Garantir bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos_ponto', 'fotos_ponto', false)
ON CONFLICT (id) DO NOTHING;

-- Storage SELECT
DROP POLICY IF EXISTS "user reads own foto or admin" ON storage.objects;
DROP POLICY IF EXISTS "auth reads fotos" ON storage.objects;
DROP POLICY IF EXISTS "public reads fotos" ON storage.objects;
CREATE POLICY "user reads own foto or admin" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'fotos_ponto'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Storage INSERT
DROP POLICY IF EXISTS "auth uploads fotos" ON storage.objects;
CREATE POLICY "auth uploads fotos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos_ponto' AND (storage.foldername(name))[1] = (auth.uid())::text);

-- Storage UPDATE (novo!)
DROP POLICY IF EXISTS "user updates own foto or admin" ON storage.objects;
CREATE POLICY "user updates own foto or admin" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'fotos_ponto'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    bucket_id = 'fotos_ponto'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Storage DELETE
DROP POLICY IF EXISTS "admin deletes fotos" ON storage.objects;
CREATE POLICY "admin deletes fotos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fotos_ponto' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- =====================================================
-- EXTENSÕES: Revogar EXECUTE de net/cron
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'net') THEN
    REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA net FROM PUBLIC, anon;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA cron FROM PUBLIC, anon;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA cron TO authenticated;
  END IF;
END $$;

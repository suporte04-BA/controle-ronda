-- =============================================================
-- CLEANUP: Manter apenas suporte04@baeletrica.com.br
-- EXECUTAR NO SUPABASE DASHBOARD > SQL Editor
-- =============================================================

-- 1. Identificar o user_id do suporte04
DO $$
DECLARE
  suporte_user_id UUID;
BEGIN
  SELECT id INTO suporte_user_id
  FROM auth.users
  WHERE email = 'suporte04@baeletrica.com.br'
  LIMIT 1;

  IF suporte_user_id IS NULL THEN
    RAISE NOTICE 'suporte04@baeletrica.com.br não encontrado em auth.users';
    RETURN;
  END IF;

  RAISE NOTICE 'suporte04 user_id: %', suporte_user_id;

  -- 2. Deletar registros_ponto de todos exceto suporte04 (OPCIONAL - descomente se quiser limpar histórico)
  -- DELETE FROM public.registros_ponto WHERE user_id != suporte_user_id;

  -- 3. Deletar de user_roles todos exceto suporte04
  DELETE FROM public.user_roles WHERE user_id != suporte_user_id;

  -- 4. Deletar de profiles todos exceto suporte04
  DELETE FROM public.profiles WHERE id != suporte_user_id;

  -- 5. Deletar de auth.users todos exceto suporte04
  -- NOTA: Isso pode falhar se houver FKs. Usar com cuidado.
  DELETE FROM auth.users WHERE id != suporte_user_id;

  -- 6. Garantir que suporte04 tem role admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (suporte_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 7. Garantir que suporte04 tem profile
  INSERT INTO public.profiles (id, email, nome)
  VALUES (suporte_user_id, 'suporte04@baeletrica.com.br', 'Suporte BA Elétrica')
  ON CONFLICT (id) DO UPDATE SET
    email = 'suporte04@baeletrica.com.br',
    nome = 'Suporte BA Elétrica';

  RAISE NOTICE 'Limpeza concluída. Apenas suporte04@baeletrica.com.br permanece.';
END $$;

-- 8. Corrigir privacidade do bucket (migration anterior não aplicou)
UPDATE storage.buckets SET public = false WHERE id = 'fotos_ponto';

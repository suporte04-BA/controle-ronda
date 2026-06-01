
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Tighten bucket read: only authenticated users can list/read fotos
DROP POLICY IF EXISTS "public reads fotos" ON storage.objects;
CREATE POLICY "auth reads fotos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fotos_ponto');

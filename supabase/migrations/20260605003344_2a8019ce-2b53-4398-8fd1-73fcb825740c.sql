
-- Storage: restrict SELECT to own folder or admin
DROP POLICY IF EXISTS "auth reads fotos" ON storage.objects;

CREATE POLICY "user reads own foto or admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fotos_ponto'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- user_roles: explicit INSERT block for non-admins
DROP POLICY IF EXISTS "only admin inserts roles" ON public.user_roles;
CREATE POLICY "only admin inserts roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "only admin updates roles" ON public.user_roles;
CREATE POLICY "only admin updates roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "only admin deletes roles" ON public.user_roles;
CREATE POLICY "only admin deletes roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

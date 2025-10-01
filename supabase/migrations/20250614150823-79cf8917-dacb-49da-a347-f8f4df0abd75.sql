
-- 1. Drop old policy (if it exists)
DROP POLICY IF EXISTS "Admin can read all profiles or user their own" ON public.profiles;

-- 2. Create improved policy: super_admin OR admin OR self can SELECT any row
CREATE POLICY "Admin or Super Admin can read all profiles, users only their own"
  ON public.profiles
  FOR SELECT
  USING (
    user_role IN ('admin', 'super_admin') OR id = auth.uid()
  );

-- 3. Optional: check current user_role values in profiles
-- SELECT id, email, user_role, phone FROM public.profiles ORDER BY created_at DESC;


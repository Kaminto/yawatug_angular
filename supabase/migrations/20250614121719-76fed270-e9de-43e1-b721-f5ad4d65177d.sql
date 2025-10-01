
-- Remove the legacy policy if it exists
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a new RLS policy using user_role field (text column)
CREATE POLICY "Admins can view all profiles with user_role column"
  ON public.profiles
  FOR SELECT
  USING (
    (user_role = 'admin') OR (id = auth.uid())
  );

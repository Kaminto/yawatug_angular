
-- 1. Remove the broken policy
DROP POLICY IF EXISTS "Admin or Super Admin can read all profiles, users only their own" ON public.profiles;

-- 2. Create a security-definer function to fetch the current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT user_role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 3. Create improved RLS policy using the security-definer
CREATE POLICY "Admins and super_admins can read all profiles, users only their own"
  ON public.profiles
  FOR SELECT
  USING (
    public.get_current_user_role() IN ('admin', 'super_admin') OR id = auth.uid()
  );

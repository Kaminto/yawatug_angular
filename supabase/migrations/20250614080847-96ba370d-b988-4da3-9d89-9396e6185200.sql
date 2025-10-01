
-- 1. Update your profile row to set user_type = 'admin' for your email
UPDATE public.profiles
SET user_type = 'admin'
WHERE email = 'yawatu256@gmail.com';

-- 2. Enable row level security on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop any conflicting admin RLS policy if it exists
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 4. Create new admin RLS policy to allow admins access to all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    (user_type = 'admin') OR (id = auth.uid())
  );

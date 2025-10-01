
-- 1. Enable RLS on the profiles table.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Allow admins to see every profile, and users to see only their own.
CREATE POLICY "Admin can read all profiles or user their own"
  ON public.profiles
  FOR SELECT
  USING (
    user_role = 'admin' OR id = auth.uid()
  );

-- 3. (Optional, but safer) Allow users to update only their own profile.
CREATE POLICY "User can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

-- 4. (Optional, but safer) Allow insert for newly registered users (if handled via triggers).
CREATE POLICY "User can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

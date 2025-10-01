-- Fix missing WITH CHECK clauses on profiles UPDATE policies
-- The issue is that all UPDATE policies have USING but no WITH CHECK

-- Drop the existing UPDATE policies to recreate them with proper WITH CHECK
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "User can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate UPDATE policies with proper WITH CHECK clauses

-- Policy for admins to update any profile
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE 
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Policy for users to update their own profiles
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
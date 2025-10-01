-- Fix RLS policies for profiles table to allow admin updates

-- First, drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "User can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create comprehensive RLS policies for profiles table

-- Policy for users to update their own profiles
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy for admins to update any profile
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE 
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Ensure the is_admin function exists
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND user_role = 'admin'
  );
END;
$$;
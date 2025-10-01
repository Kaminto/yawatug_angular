-- Drop the existing policies and recreate with proper admin function
DROP POLICY IF EXISTS "Admins can view all shares" ON public.shares;
DROP POLICY IF EXISTS "Admins can create shares" ON public.shares;
DROP POLICY IF EXISTS "Admins can update shares" ON public.shares;
DROP POLICY IF EXISTS "Admins can delete shares" ON public.shares;
DROP POLICY IF EXISTS "Users can view shares for purchasing" ON public.shares;

-- Create is_admin function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_id 
    AND profiles.user_role = 'admin'
  );
END;
$$;

-- Recreate policies using the is_admin function
CREATE POLICY "Admins can view all shares" ON public.shares
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create shares" ON public.shares
FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update shares" ON public.shares
FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete shares" ON public.shares
FOR DELETE USING (is_admin(auth.uid()));

-- Allow users to view shares for purchasing
CREATE POLICY "Users can view shares for purchasing" ON public.shares
FOR SELECT USING (true);
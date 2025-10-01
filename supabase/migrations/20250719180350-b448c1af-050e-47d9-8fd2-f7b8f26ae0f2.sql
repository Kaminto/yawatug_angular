-- Update the is_admin function to check both user_role and user_type
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id 
    AND (user_role = 'admin' OR user_type = 'admin')
  );
END;
$$;
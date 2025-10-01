-- Fix admin access by updating RLS policy for profiles table
-- Allow users to read their own profile data including admin status

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT 
USING (auth.uid() = id);

-- Ensure admin function works correctly
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    target_user_id UUID;
    user_role_result TEXT;
BEGIN
    -- Use provided user_id or default to current authenticated user
    target_user_id := COALESCE(user_id, auth.uid());
    
    -- Return false if no user ID
    IF target_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get user role from profiles table
    SELECT user_role INTO user_role_result
    FROM public.profiles 
    WHERE id = target_user_id;
    
    -- Return true if user is admin
    RETURN COALESCE(user_role_result = 'admin', FALSE);
END;
$$;
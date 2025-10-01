-- Add specific WITH CHECK policy for admin profile updates
-- The issue is that admins can SELECT but don't have proper WITH CHECK for UPDATE

-- First check what policies exist
SELECT policyname, cmd, permissive, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'UPDATE';
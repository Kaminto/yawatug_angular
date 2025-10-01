-- Add RLS policy to allow admins to insert profiles for other users
CREATE POLICY "Admins can insert profiles for other users" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND user_role = 'admin'
  )
);
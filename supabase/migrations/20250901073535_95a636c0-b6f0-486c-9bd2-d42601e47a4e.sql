-- Create RLS policies for the shares table

-- Allow admins to view all shares
CREATE POLICY "Admins can view all shares" ON public.shares
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

-- Allow admins to insert shares
CREATE POLICY "Admins can create shares" ON public.shares
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

-- Allow admins to update shares
CREATE POLICY "Admins can update shares" ON public.shares
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

-- Allow admins to delete shares
CREATE POLICY "Admins can delete shares" ON public.shares
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

-- Allow users to view share information for share purchases
CREATE POLICY "Users can view shares for purchasing" ON public.shares
FOR SELECT USING (true);
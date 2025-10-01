-- Only add the admin management policy that's missing
CREATE POLICY "Admins can manage mining projects" ON public.mining_projects
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);
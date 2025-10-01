
-- Update RLS policies for share_reserve_allocations to allow admin operations
DROP POLICY IF EXISTS "Admins can manage all share reserve allocations" ON public.share_reserve_allocations;

-- Create a more permissive policy for admins
CREATE POLICY "Admins can manage share reserve allocations"
  ON public.share_reserve_allocations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND (user_role = 'admin' OR user_type = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND (user_role = 'admin' OR user_type = 'admin')
    )
  );

-- Also ensure admins can manage shares table
DROP POLICY IF EXISTS "Admins can manage shares" ON public.shares;

CREATE POLICY "Admins can manage shares" 
  ON public.shares 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND (user_role = 'admin' OR user_type = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND (user_role = 'admin' OR user_type = 'admin')
    )
  );

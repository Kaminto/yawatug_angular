
-- Allow admins to fully manage share reserve allocations

-- Enable row-level security (if not already enabled)
ALTER TABLE public.share_reserve_allocations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can perform all actions on share_reserve_allocations
CREATE POLICY "Admins can manage all share reserve allocations"
  ON public.share_reserve_allocations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND user_type = 'admin'
    )
  );

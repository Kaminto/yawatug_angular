
-- Drop the existing incorrect RLS policy
DROP POLICY IF EXISTS "Only admins can access admin sub-wallets" ON public.admin_sub_wallets;

-- Create the correct RLS policy that checks user_role instead of user_type
CREATE POLICY "Only admins can access admin sub-wallets" 
ON public.admin_sub_wallets 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role = 'admin'
  )
);

-- Also update the admin_wallet_fund_transfers table RLS policy for consistency
DROP POLICY IF EXISTS "Only admins can access admin fund transfers" ON public.admin_wallet_fund_transfers;

CREATE POLICY "Only admins can access admin fund transfers" 
ON public.admin_wallet_fund_transfers 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role = 'admin'
  )
);

-- Update the admin_wallet_approvals table RLS policy as well
DROP POLICY IF EXISTS "Admins can manage wallet approvals" ON public.admin_wallet_approvals;

CREATE POLICY "Admins can manage wallet approvals" 
ON public.admin_wallet_approvals 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role = 'admin'
  )
);

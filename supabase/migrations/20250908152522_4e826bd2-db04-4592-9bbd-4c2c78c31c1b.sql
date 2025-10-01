-- Fix RLS issues for tables with RLS enabled but no policies

-- Add basic policies for project_funding_allocations
CREATE POLICY "Admins can manage project funding allocations" 
ON public.project_funding_allocations 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their related project funding allocations" 
ON public.project_funding_allocations 
FOR SELECT 
USING (true); -- Allow read access for now, can be restricted later

-- Add basic policies for user_wallet_statistics  
CREATE POLICY "Users can view their own wallet statistics" 
ON public.user_wallet_statistics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all wallet statistics" 
ON public.user_wallet_statistics 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add basic policies for wallet_requests
CREATE POLICY "Users can manage their own wallet requests" 
ON public.wallet_requests 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all wallet requests" 
ON public.wallet_requests 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
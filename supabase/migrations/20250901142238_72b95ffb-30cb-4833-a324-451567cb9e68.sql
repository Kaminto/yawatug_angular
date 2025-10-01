-- Allow users to view active merchant codes for deposits
CREATE POLICY "Users can view active merchant codes for deposits" 
ON public.admin_merchant_codes 
FOR SELECT 
USING (is_active = true AND approval_status = 'approved');
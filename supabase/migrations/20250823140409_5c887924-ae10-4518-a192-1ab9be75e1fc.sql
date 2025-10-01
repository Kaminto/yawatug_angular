-- Add approval_status column to admin_merchant_codes table
ALTER TABLE public.admin_merchant_codes 
ADD COLUMN approval_status TEXT DEFAULT 'approved';

-- Add approval_status column to admin_bank_accounts table
ALTER TABLE public.admin_bank_accounts 
ADD COLUMN approval_status TEXT DEFAULT 'approved';

-- Add indexes for better performance
CREATE INDEX idx_admin_merchant_codes_approval_status ON public.admin_merchant_codes(approval_status);
CREATE INDEX idx_admin_bank_accounts_approval_status ON public.admin_bank_accounts(approval_status);
-- Create new account-type based selling limits table
CREATE TABLE public.share_selling_limits_by_account (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_type TEXT NOT NULL,
  limit_type TEXT NOT NULL CHECK (limit_type IN ('quantity', 'percentage')),
  daily_limit NUMERIC NOT NULL DEFAULT 0,
  weekly_limit NUMERIC NOT NULL DEFAULT 0,
  monthly_limit NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_type, limit_type)
);

-- Create new account-type based transfer limits table
CREATE TABLE public.share_transfer_limits_by_account (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_type TEXT NOT NULL,
  daily_limit_shares NUMERIC NOT NULL DEFAULT 0,
  weekly_limit_shares NUMERIC NOT NULL DEFAULT 0,
  monthly_limit_shares NUMERIC NOT NULL DEFAULT 0,
  minimum_transfer_value NUMERIC NOT NULL DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_type)
);

-- Enable RLS on new tables
ALTER TABLE public.share_selling_limits_by_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_transfer_limits_by_account ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for selling limits
CREATE POLICY "Admins can manage selling limits by account" 
ON public.share_selling_limits_by_account 
FOR ALL 
USING (is_admin(auth.uid())) 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view selling limits by account" 
ON public.share_selling_limits_by_account 
FOR SELECT 
USING (true);

-- Create RLS policies for transfer limits
CREATE POLICY "Admins can manage transfer limits by account" 
ON public.share_transfer_limits_by_account 
FOR ALL 
USING (is_admin(auth.uid())) 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view transfer limits by account" 
ON public.share_transfer_limits_by_account 
FOR SELECT 
USING (true);

-- Insert default limits for different account types
INSERT INTO public.share_selling_limits_by_account (account_type, limit_type, daily_limit, weekly_limit, monthly_limit) VALUES
('individual', 'quantity', 100, 500, 2000),
('individual', 'percentage', 10, 25, 50),
('business', 'quantity', 1000, 5000, 20000),
('business', 'percentage', 20, 40, 80),
('organisation', 'quantity', 5000, 25000, 100000),
('organisation', 'percentage', 30, 60, 100);

INSERT INTO public.share_transfer_limits_by_account (account_type, daily_limit_shares, weekly_limit_shares, monthly_limit_shares, minimum_transfer_value) VALUES
('individual', 100, 500, 2000, 1000),
('business', 1000, 5000, 20000, 5000),
('organisation', 5000, 25000, 100000, 10000);

-- Deprecate share_trading_limits table by marking it inactive
UPDATE public.share_trading_limits SET is_active = false WHERE is_active = true;
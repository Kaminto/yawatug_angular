
-- Create admin sub-wallets table for the 3-account structure
CREATE TABLE IF NOT EXISTS public.admin_sub_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_name TEXT NOT NULL UNIQUE,
  wallet_type TEXT NOT NULL, -- 'project_funding', 'admin_fund', 'share_buyback_fund'
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'UGX',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert the 3 required sub-wallets
INSERT INTO public.admin_sub_wallets (wallet_name, wallet_type, description) VALUES 
  ('Project Funding Account', 'project_funding', 'Funds allocated for mining project investments'),
  ('Admin Fund Account', 'admin_fund', 'Administrative funds for operations, fees collection, and general expenses'),
  ('Share Buyback Fund', 'share_buyback_fund', 'Dedicated funds for share buyback operations')
ON CONFLICT (wallet_name) DO NOTHING;

-- Create admin wallet transactions table for better tracking
CREATE TABLE IF NOT EXISTS public.admin_wallet_fund_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_wallet_id UUID REFERENCES public.admin_sub_wallets(id),
  to_wallet_id UUID REFERENCES public.admin_sub_wallets(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  transfer_type TEXT NOT NULL, -- 'manual', 'automatic', 'fee_allocation', 'promotion_deduction'
  description TEXT,
  reference TEXT,
  created_by UUID,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user wallet limits table
CREATE TABLE IF NOT EXISTS public.user_wallet_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  currency TEXT NOT NULL,
  daily_deposit_limit NUMERIC DEFAULT NULL,
  daily_withdraw_limit NUMERIC DEFAULT NULL,
  monthly_deposit_limit NUMERIC DEFAULT NULL,
  monthly_withdraw_limit NUMERIC DEFAULT NULL,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspension_reason TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency)
);

-- Add RLS policies for admin sub-wallets
ALTER TABLE public.admin_sub_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_wallet_fund_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallet_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can access admin sub-wallets
CREATE POLICY "Only admins can access admin sub-wallets" 
  ON public.admin_sub_wallets 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  ));

CREATE POLICY "Only admins can access admin fund transfers" 
  ON public.admin_wallet_fund_transfers 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  ));

CREATE POLICY "Only admins can access user wallet limits" 
  ON public.user_wallet_limits 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  ));

-- Create function to automatically allocate transaction fees to admin fund
CREATE OR REPLACE FUNCTION public.allocate_transaction_fee(
  fee_amount NUMERIC,
  fee_currency TEXT DEFAULT 'UGX'
) RETURNS VOID AS $$
DECLARE
  admin_fund_id UUID;
BEGIN
  -- Get the admin fund wallet ID
  SELECT id INTO admin_fund_id 
  FROM public.admin_sub_wallets 
  WHERE wallet_type = 'admin_fund' AND currency = fee_currency;
  
  IF admin_fund_id IS NOT NULL THEN
    -- Update admin fund balance
    UPDATE public.admin_sub_wallets 
    SET balance = balance + fee_amount,
        updated_at = now()
    WHERE id = admin_fund_id;
    
    -- Record the transaction
    INSERT INTO public.admin_wallet_fund_transfers (
      to_wallet_id, amount, currency, transfer_type, description
    ) VALUES (
      admin_fund_id, fee_amount, fee_currency, 'fee_allocation', 
      'Automatic transaction fee allocation'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to deduct promotion costs from admin fund
CREATE OR REPLACE FUNCTION public.deduct_from_admin_fund(
  deduction_amount NUMERIC,
  deduction_currency TEXT DEFAULT 'UGX',
  deduction_type TEXT DEFAULT 'promotion',
  deduction_description TEXT DEFAULT 'Admin fund deduction'
) RETURNS BOOLEAN AS $$
DECLARE
  admin_fund_id UUID;
  current_balance NUMERIC;
BEGIN
  -- Get the admin fund wallet
  SELECT id, balance INTO admin_fund_id, current_balance
  FROM public.admin_sub_wallets 
  WHERE wallet_type = 'admin_fund' AND currency = deduction_currency;
  
  IF admin_fund_id IS NOT NULL AND current_balance >= deduction_amount THEN
    -- Update admin fund balance
    UPDATE public.admin_sub_wallets 
    SET balance = balance - deduction_amount,
        updated_at = now()
    WHERE id = admin_fund_id;
    
    -- Record the transaction
    INSERT INTO public.admin_wallet_fund_transfers (
      from_wallet_id, amount, currency, transfer_type, description
    ) VALUES (
      admin_fund_id, deduction_amount, deduction_currency, deduction_type, deduction_description
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger for admin sub-wallets
CREATE TRIGGER update_admin_sub_wallets_updated_at 
  BEFORE UPDATE ON public.admin_sub_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_wallet_fund_transfers_updated_at 
  BEFORE UPDATE ON public.admin_wallet_fund_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_wallet_limits_updated_at 
  BEFORE UPDATE ON public.user_wallet_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

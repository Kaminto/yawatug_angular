
-- Create admin_expenses table
CREATE TABLE public.admin_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.admin_expense_categories(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  description TEXT NOT NULL,
  reference TEXT,
  processed_by UUID NOT NULL REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_gateways table
CREATE TABLE public.payment_gateways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mobile_money', 'bank', 'cash_office')),
  currency TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  account_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.admin_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_expenses
CREATE POLICY "Admins can manage admin expenses"
ON public.admin_expenses
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create policies for payment_gateways
CREATE POLICY "Admins can manage payment gateways"
ON public.payment_gateways
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create policy for users to view active payment gateways
CREATE POLICY "Users can view active payment gateways"
ON public.payment_gateways
FOR SELECT
TO authenticated
USING (is_active = true);

-- Add triggers for updated_at
CREATE TRIGGER update_admin_expenses_timestamp
BEFORE UPDATE ON public.admin_expenses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_gateways_timestamp
BEFORE UPDATE ON public.payment_gateways
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default payment gateways
INSERT INTO public.payment_gateways (name, type, currency, balance, account_details) VALUES
('MTN Mobile Money', 'mobile_money', 'UGX', 0, '{"provider": "MTN", "account_number": "256701234567"}'),
('Airtel Money', 'mobile_money', 'UGX', 0, '{"provider": "Airtel", "account_number": "256751234567"}'),
('Stanbic Bank', 'bank', 'UGX', 0, '{"bank_name": "Stanbic Bank", "account_number": "9030012345678", "branch": "Kampala"}'),
('DFCU Bank', 'bank', 'USD', 0, '{"bank_name": "DFCU Bank", "account_number": "01234567890", "branch": "Kampala"}'),
('Cash Office Kampala', 'cash_office', 'UGX', 0, '{"location": "Kampala Main Office", "address": "Plot 123, Kampala Road"}');

-- Create function for transferring funds to user wallet
CREATE OR REPLACE FUNCTION public.transfer_to_user_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_description TEXT DEFAULT 'Fund transfer',
  p_admin_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wallet_id UUID;
BEGIN
  -- Get user wallet
  SELECT id INTO wallet_id
  FROM public.wallets
  WHERE user_id = p_user_id AND currency = p_currency;
  
  IF wallet_id IS NULL THEN
    RAISE EXCEPTION 'User wallet not found for currency %', p_currency;
  END IF;
  
  -- Update wallet balance
  UPDATE public.wallets
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE id = wallet_id;
  
  -- Record transaction
  INSERT INTO public.transactions (
    user_id, wallet_id, amount, currency, transaction_type, status, description
  ) VALUES (
    p_user_id, wallet_id, p_amount, p_currency, 'admin_transfer', 'completed', p_description
  );
  
  RETURN TRUE;
END;
$$;

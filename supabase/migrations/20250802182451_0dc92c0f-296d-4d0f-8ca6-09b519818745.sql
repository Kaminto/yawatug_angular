-- Create debt conversion fee payments table
CREATE TABLE public.debt_conversion_fee_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_member_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  payment_method TEXT NOT NULL,
  transaction_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.debt_conversion_fee_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Club members can view their own fee payments" 
ON public.debt_conversion_fee_payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM investment_club_members icm 
  WHERE icm.id = club_member_id AND icm.user_id = auth.uid()
));

CREATE POLICY "Club members can create their own fee payments" 
ON public.debt_conversion_fee_payments 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM investment_club_members icm 
  WHERE icm.id = club_member_id AND icm.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all fee payments" 
ON public.debt_conversion_fee_payments 
FOR ALL 
USING (is_admin(auth.uid()));

-- Update debt conversion agreements table
ALTER TABLE public.debt_conversion_agreements 
ADD COLUMN IF NOT EXISTS fee_payment_id UUID REFERENCES debt_conversion_fee_payments(id),
ADD COLUMN IF NOT EXISTS fee_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS conversion_eligible BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS current_share_price_at_agreement NUMERIC;

-- Create debt conversion fee settings table
CREATE TABLE public.debt_conversion_fee_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixed_fee_amount NUMERIC NOT NULL DEFAULT 50000,
  percentage_fee NUMERIC NOT NULL DEFAULT 2.5,
  currency TEXT NOT NULL DEFAULT 'UGX',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.debt_conversion_fee_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active fee settings" 
ON public.debt_conversion_fee_settings 
FOR SELECT 
USING (is_active = TRUE);

CREATE POLICY "Admins can manage fee settings" 
ON public.debt_conversion_fee_settings 
FOR ALL 
USING (is_admin(auth.uid()));

-- Insert default fee settings
INSERT INTO public.debt_conversion_fee_settings (
  fixed_fee_amount, 
  percentage_fee, 
  currency, 
  is_active, 
  created_by
) VALUES (
  50000, 
  2.5, 
  'UGX', 
  TRUE, 
  (SELECT id FROM profiles WHERE user_role = 'admin' LIMIT 1)
);

-- Create function to calculate conversion fee
CREATE OR REPLACE FUNCTION public.calculate_debt_conversion_fee(p_debt_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fee_settings RECORD;
  calculated_fee NUMERIC := 0;
BEGIN
  -- Get active fee settings
  SELECT * INTO fee_settings
  FROM debt_conversion_fee_settings
  WHERE is_active = TRUE
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF fee_settings IS NOT NULL THEN
    calculated_fee := fee_settings.fixed_fee_amount + (p_debt_amount * fee_settings.percentage_fee / 100);
  ELSE
    -- Fallback fee calculation
    calculated_fee := 50000 + (p_debt_amount * 2.5 / 100);
  END IF;
  
  RETURN calculated_fee;
END;
$$;

-- Create function to check conversion eligibility
CREATE OR REPLACE FUNCTION public.check_debt_conversion_eligibility(p_club_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  member_record RECORD;
  current_share_price NUMERIC;
  fee_paid BOOLEAN := FALSE;
  result JSONB;
BEGIN
  -- Get club member details
  SELECT * INTO member_record
  FROM investment_club_members
  WHERE id = p_club_member_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'error', 'Member not found');
  END IF;
  
  -- Get current share price
  SELECT get_current_share_price((SELECT id FROM shares LIMIT 1), 'buy') INTO current_share_price;
  
  -- Check if fee is paid
  SELECT EXISTS (
    SELECT 1 FROM debt_conversion_fee_payments
    WHERE club_member_id = p_club_member_id AND status = 'completed'
  ) INTO fee_paid;
  
  result := jsonb_build_object(
    'eligible', (fee_paid AND member_record.net_balance >= current_share_price),
    'fee_paid', fee_paid,
    'net_balance', member_record.net_balance,
    'current_share_price', current_share_price,
    'balance_sufficient', (member_record.net_balance >= current_share_price)
  );
  
  RETURN result;
END;
$$;
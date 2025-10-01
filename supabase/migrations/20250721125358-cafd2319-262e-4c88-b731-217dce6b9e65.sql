
-- Create missing admin_expense_categories table
CREATE TABLE public.admin_expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.admin_expense_categories ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage expense categories
CREATE POLICY "Admins can manage expense categories"
ON public.admin_expense_categories
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Insert default expense categories
INSERT INTO public.admin_expense_categories (name, description) VALUES
('salaries_wages', 'Staff salaries and wages'),
('office_rent', 'Office rent and utilities'),
('utilities', 'Power, water, internet bills'),
('meals', 'Staff meals and refreshments'),
('transport', 'Transportation expenses'),
('marketing', 'Marketing and advertising'),
('equipment', 'Office equipment and supplies'),
('legal_professional', 'Legal and professional fees'),
('insurance', 'Insurance premiums'),
('maintenance', 'Maintenance and repairs'),
('training', 'Staff training and development'),
('other', 'Other miscellaneous expenses');

-- Create user_wallet_limits table
CREATE TABLE public.user_wallet_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'UGX',
  daily_deposit_limit NUMERIC,
  daily_withdraw_limit NUMERIC,
  monthly_deposit_limit NUMERIC,
  monthly_withdraw_limit NUMERIC,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspension_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, currency)
);

-- Add Row Level Security
ALTER TABLE public.user_wallet_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage user wallet limits
CREATE POLICY "Admins can manage user wallet limits"
ON public.user_wallet_limits
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create policy for users to view their own limits
CREATE POLICY "Users can view their own wallet limits"
ON public.user_wallet_limits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add trigger to update timestamps
CREATE OR REPLACE FUNCTION update_user_wallet_limits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_wallet_limits_timestamp
BEFORE UPDATE ON public.user_wallet_limits
FOR EACH ROW EXECUTE FUNCTION update_user_wallet_limits_timestamp();

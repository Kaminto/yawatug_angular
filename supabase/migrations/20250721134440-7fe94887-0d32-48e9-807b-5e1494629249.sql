
-- Create the missing admin_expense_categories table first
CREATE TABLE public.admin_expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_expense_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage expense categories"
ON public.admin_expense_categories
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Insert default expense categories
INSERT INTO public.admin_expense_categories (name, description) VALUES
('Salaries and Wages', 'Employee compensation and benefits'),
('Office Rent', 'Monthly office rental payments'),
('Utilities', 'Power, water, internet, and other utilities'),
('Meals and Entertainment', 'Business meals and entertainment expenses'),
('Marketing and Advertising', 'Promotional and marketing expenses'),
('Office Supplies', 'Stationery, equipment, and office materials'),
('Travel and Transport', 'Business travel and transportation costs'),
('Professional Services', 'Legal, accounting, and consulting fees'),
('Insurance', 'Business insurance premiums'),
('Maintenance and Repairs', 'Equipment and facility maintenance'),
('Communication', 'Phone, internet, and communication services'),
('Training and Development', 'Employee training and development costs'),
('Taxes and Licenses', 'Business taxes and license fees'),
('Miscellaneous', 'Other administrative expenses');

-- Create the critical fund allocation function
CREATE OR REPLACE FUNCTION public.allocate_share_purchase_proceeds_enhanced(
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'UGX',
  p_transaction_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  allocation_rule RECORD;
  project_amount NUMERIC := 0;
  admin_amount NUMERIC := 0;
  buyback_amount NUMERIC := 0;
  project_wallet_id UUID;
  admin_wallet_id UUID;
  buyback_wallet_id UUID;
  result JSONB;
BEGIN
  -- Get active allocation rule or use defaults
  SELECT * INTO allocation_rule
  FROM allocation_rules
  WHERE currency = p_currency AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Use default percentages if no rule found
  IF allocation_rule IS NULL THEN
    project_amount := p_amount * 0.60; -- 60% to projects
    admin_amount := p_amount * 0.20;   -- 20% to admin fund
    buyback_amount := p_amount * 0.20; -- 20% to buyback
  ELSE
    project_amount := (p_amount * allocation_rule.project_funding_percent) / 100;
    admin_amount := (p_amount * allocation_rule.expenses_percent) / 100;
    buyback_amount := (p_amount * allocation_rule.buyback_percent) / 100;
  END IF;
  
  -- Get wallet IDs
  SELECT id INTO project_wallet_id FROM admin_sub_wallets 
  WHERE wallet_type = 'project_funding' AND currency = p_currency LIMIT 1;
  
  SELECT id INTO admin_wallet_id FROM admin_sub_wallets 
  WHERE wallet_type = 'admin_fund' AND currency = p_currency LIMIT 1;
  
  SELECT id INTO buyback_wallet_id FROM admin_sub_wallets 
  WHERE wallet_type = 'share_buyback' AND currency = p_currency LIMIT 1;
  
  -- Update balances
  IF project_wallet_id IS NOT NULL THEN
    UPDATE admin_sub_wallets 
    SET balance = balance + project_amount, updated_at = now()
    WHERE id = project_wallet_id;
  END IF;
  
  IF admin_wallet_id IS NOT NULL THEN
    UPDATE admin_sub_wallets 
    SET balance = balance + admin_amount, updated_at = now()
    WHERE id = admin_wallet_id;
  END IF;
  
  IF buyback_wallet_id IS NOT NULL THEN
    UPDATE admin_sub_wallets 
    SET balance = balance + buyback_amount, updated_at = now()
    WHERE id = buyback_wallet_id;
  END IF;
  
  -- Record transfers
  INSERT INTO admin_wallet_fund_transfers (
    to_wallet_id, amount, currency, transfer_type, description, reference
  ) VALUES 
  (project_wallet_id, project_amount, p_currency, 'share_proceeds', 'Project funding allocation from share sale', p_transaction_id::TEXT),
  (admin_wallet_id, admin_amount, p_currency, 'share_proceeds', 'Admin fund allocation from share sale', p_transaction_id::TEXT),
  (buyback_wallet_id, buyback_amount, p_currency, 'share_proceeds', 'Buyback fund allocation from share sale', p_transaction_id::TEXT);
  
  result := jsonb_build_object(
    'success', true,
    'project_funding', project_amount,
    'admin_fund', admin_amount,
    'buyback_fund', buyback_amount,
    'total_allocated', project_amount + admin_amount + buyback_amount
  );
  
  RETURN result;
END;
$$;

-- Create trigger to automatically allocate funds when share purchases are completed
CREATE OR REPLACE FUNCTION public.auto_allocate_share_proceeds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allocate for completed share purchase transactions
  IF NEW.status = 'completed' 
     AND NEW.transaction_type = 'share_purchase' 
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Call allocation function
    PERFORM allocate_share_purchase_proceeds_enhanced(
      ABS(NEW.amount),
      NEW.currency,
      NEW.id,
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to transactions table
DROP TRIGGER IF EXISTS trigger_auto_allocate_share_proceeds ON public.transactions;
CREATE TRIGGER trigger_auto_allocate_share_proceeds
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_allocate_share_proceeds();

-- Backfill existing share purchase allocations
DO $$
DECLARE
  transaction_record RECORD;
  total_allocated NUMERIC := 0;
BEGIN
  FOR transaction_record IN 
    SELECT id, amount, currency, user_id
    FROM transactions 
    WHERE transaction_type = 'share_purchase' 
    AND status = 'completed'
    AND created_at >= '2024-01-01'  -- Adjust date as needed
  LOOP
    -- Allocate funds for this transaction
    PERFORM allocate_share_purchase_proceeds_enhanced(
      ABS(transaction_record.amount),
      transaction_record.currency,
      transaction_record.id,
      transaction_record.user_id
    );
    
    total_allocated := total_allocated + ABS(transaction_record.amount);
  END LOOP;
  
  RAISE NOTICE 'Backfilled allocations for % UGX in share purchases', total_allocated;
END;
$$;

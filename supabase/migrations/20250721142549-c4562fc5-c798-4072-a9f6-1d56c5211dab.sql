-- Phase 1: Fix Critical Database Issues

-- First, let's check and fix wallet types in admin_sub_wallets
UPDATE public.admin_sub_wallets 
SET wallet_type = 'share_buyback' 
WHERE wallet_type = 'share_buyback_fund';

-- Update the allocation function to use correct wallet types
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
  
  -- Get wallet IDs with correct wallet types
  SELECT id INTO project_wallet_id FROM admin_sub_wallets 
  WHERE wallet_type = 'project_funding' AND currency = p_currency LIMIT 1;
  
  SELECT id INTO admin_wallet_id FROM admin_sub_wallets 
  WHERE wallet_type = 'admin_fund' AND currency = p_currency LIMIT 1;
  
  SELECT id INTO buyback_wallet_id FROM admin_sub_wallets 
  WHERE wallet_type = 'share_buyback' AND currency = p_currency LIMIT 1;
  
  -- Update balances only if wallets exist
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
  
  -- Record transfers only for existing wallets
  IF project_wallet_id IS NOT NULL THEN
    INSERT INTO admin_wallet_fund_transfers (
      to_wallet_id, amount, currency, transfer_type, description, reference
    ) VALUES (
      project_wallet_id, project_amount, p_currency, 'share_proceeds', 'Project funding allocation from share sale', p_transaction_id::TEXT
    );
  END IF;
  
  IF admin_wallet_id IS NOT NULL THEN
    INSERT INTO admin_wallet_fund_transfers (
      to_wallet_id, amount, currency, transfer_type, description, reference
    ) VALUES (
      admin_wallet_id, admin_amount, p_currency, 'share_proceeds', 'Admin fund allocation from share sale', p_transaction_id::TEXT
    );
  END IF;
  
  IF buyback_wallet_id IS NOT NULL THEN
    INSERT INTO admin_wallet_fund_transfers (
      to_wallet_id, amount, currency, transfer_type, description, reference
    ) VALUES (
      buyback_wallet_id, buyback_amount, p_currency, 'share_proceeds', 'Buyback fund allocation from share sale', p_transaction_id::TEXT
    );
  END IF;
  
  result := jsonb_build_object(
    'success', true,
    'project_funding', project_amount,
    'admin_fund', admin_amount,
    'buyback_fund', buyback_amount,
    'total_allocated', project_amount + admin_amount + buyback_amount,
    'wallets_found', jsonb_build_object(
      'project_wallet_id', project_wallet_id,
      'admin_wallet_id', admin_wallet_id,
      'buyback_wallet_id', buyback_wallet_id
    )
  );
  
  RETURN result;
END;
$$;

-- Re-run backfill process to allocate missing funds
DO $$
DECLARE
  transaction_record RECORD;
  total_allocated NUMERIC := 0;
  allocation_result JSONB;
BEGIN
  -- Clear existing allocations first to avoid double counting
  DELETE FROM admin_wallet_fund_transfers 
  WHERE transfer_type = 'share_proceeds' 
  AND created_at >= '2024-01-01';
  
  -- Reset admin wallet balances to recalculate
  UPDATE admin_sub_wallets 
  SET balance = 0, updated_at = now()
  WHERE wallet_type IN ('project_funding', 'admin_fund', 'share_buyback');
  
  FOR transaction_record IN 
    SELECT id, amount, currency, user_id
    FROM transactions 
    WHERE transaction_type = 'share_purchase' 
    AND status = 'completed'
    AND created_at >= '2024-01-01'
  LOOP
    -- Allocate funds for this transaction
    SELECT allocate_share_purchase_proceeds_enhanced(
      ABS(transaction_record.amount),
      transaction_record.currency,
      transaction_record.id,
      transaction_record.user_id
    ) INTO allocation_result;
    
    total_allocated := total_allocated + ABS(transaction_record.amount);
  END LOOP;
  
  RAISE NOTICE 'Backfilled allocations for % UGX in share purchases', total_allocated;
END;
$$;
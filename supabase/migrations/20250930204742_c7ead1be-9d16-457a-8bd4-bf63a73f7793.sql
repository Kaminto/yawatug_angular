-- ============================================
-- COMPREHENSIVE WALLET BALANCE FIX
-- This migration establishes transactions as the single source of truth
-- ============================================

-- 1. Create a function that updates wallet balance from transactions
CREATE OR REPLACE FUNCTION public.update_wallet_balance_from_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  wallet_record RECORD;
  calculated_balance NUMERIC;
BEGIN
  -- Get the wallet record
  SELECT * INTO wallet_record
  FROM wallets
  WHERE id = COALESCE(NEW.wallet_id, OLD.wallet_id);
  
  IF wallet_record IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Calculate balance from all completed/approved transactions
  SELECT COALESCE(SUM(amount), 0) INTO calculated_balance
  FROM transactions
  WHERE wallet_id = wallet_record.id
    AND status IN ('completed', 'processing')
    AND approval_status IN ('approved', 'completed');
  
  -- Update wallet balance
  UPDATE wallets
  SET balance = calculated_balance,
      updated_at = now()
  WHERE id = wallet_record.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_wallet_balance ON transactions;

-- 3. Create trigger to auto-update wallet balance when transactions change
CREATE TRIGGER trigger_update_wallet_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance_from_transactions();

-- 4. Create a function to validate and prevent direct wallet balance updates
CREATE OR REPLACE FUNCTION public.prevent_manual_wallet_balance_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow updates if they're coming from our trigger or sync functions
  IF current_setting('app.allow_wallet_update', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- Block direct balance updates from client
  IF OLD.balance IS DISTINCT FROM NEW.balance THEN
    RAISE EXCEPTION 'Direct wallet balance updates are not allowed. Use transactions table instead.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Create trigger to prevent manual balance updates
DROP TRIGGER IF EXISTS trigger_prevent_manual_balance_update ON wallets;
CREATE TRIGGER trigger_prevent_manual_balance_update
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION prevent_manual_wallet_balance_update();

-- 6. Update the sync function to allow updates
CREATE OR REPLACE FUNCTION public.sync_wallet_balance(p_wallet_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculated_balance NUMERIC := 0;
  wallet_user_id UUID;
BEGIN
  -- Verify ownership
  SELECT user_id INTO wallet_user_id
  FROM wallets
  WHERE id = p_wallet_id;
  
  IF wallet_user_id IS NULL OR wallet_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access this wallet';
  END IF;

  -- Calculate balance from transactions
  SELECT COALESCE(SUM(amount), 0) INTO calculated_balance
  FROM transactions
  WHERE wallet_id = p_wallet_id
    AND user_id = wallet_user_id
    AND status IN ('completed', 'processing')
    AND approval_status IN ('approved', 'completed');
  
  -- Allow this update by setting the config
  PERFORM set_config('app.allow_wallet_update', 'true', true);
  
  -- Update wallet balance
  UPDATE wallets 
  SET balance = calculated_balance,
      updated_at = now()
  WHERE id = p_wallet_id;
  
  -- Reset the config
  PERFORM set_config('app.allow_wallet_update', 'false', true);
  
  RETURN calculated_balance;
END;
$$;

-- 7. Update comprehensive balance calculation
CREATE OR REPLACE FUNCTION public.calculate_simple_wallet_balance(p_wallet_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculated_balance NUMERIC := 0;
  wallet_user_id UUID;
BEGIN
  -- Verify ownership
  SELECT user_id INTO wallet_user_id
  FROM wallets
  WHERE id = p_wallet_id;
  
  IF wallet_user_id IS NULL OR wallet_user_id != auth.uid() THEN
    RETURN 0;
  END IF;

  -- Simple sum of all completed/approved transactions
  SELECT COALESCE(SUM(amount), 0) INTO calculated_balance
  FROM transactions
  WHERE wallet_id = p_wallet_id
    AND user_id = wallet_user_id
    AND status IN ('completed', 'processing')
    AND approval_status IN ('approved', 'completed');
  
  RETURN calculated_balance;
END;
$$;

-- 8. Create function to properly record share purchase transaction
CREATE OR REPLACE FUNCTION public.record_share_purchase_transaction(
  p_user_id UUID,
  p_wallet_id UUID,
  p_share_id UUID,
  p_quantity INTEGER,
  p_price_per_share NUMERIC,
  p_total_amount NUMERIC,
  p_fee_amount NUMERIC,
  p_currency TEXT,
  p_order_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  transaction_id UUID;
BEGIN
  -- Insert transaction record
  INSERT INTO transactions (
    user_id,
    wallet_id,
    amount,
    currency,
    transaction_type,
    status,
    approval_status,
    reference,
    fee_amount,
    description
  ) VALUES (
    p_user_id,
    p_wallet_id,
    -(p_total_amount + p_fee_amount), -- Negative for debit
    p_currency,
    'share_purchase',
    'completed',
    'approved',
    'Share purchase order #' || p_order_id::TEXT,
    p_fee_amount,
    format('Purchase of %s shares @ %s %s each', p_quantity, p_price_per_share, p_currency)
  )
  RETURNING id INTO transaction_id;
  
  RETURN transaction_id;
END;
$$;

-- 9. Sync all wallet balances to match transaction records
DO $$
DECLARE
  wallet_record RECORD;
  calculated_balance NUMERIC;
BEGIN
  -- Allow updates for this migration
  PERFORM set_config('app.allow_wallet_update', 'true', true);
  
  FOR wallet_record IN SELECT * FROM wallets LOOP
    -- Calculate balance from transactions
    SELECT COALESCE(SUM(amount), 0) INTO calculated_balance
    FROM transactions
    WHERE wallet_id = wallet_record.id
      AND status IN ('completed', 'processing')
      AND approval_status IN ('approved', 'completed');
    
    -- Update wallet
    UPDATE wallets
    SET balance = calculated_balance,
        updated_at = now()
    WHERE id = wallet_record.id;
  END LOOP;
  
  -- Reset config
  PERFORM set_config('app.allow_wallet_update', 'false', true);
END;
$$;
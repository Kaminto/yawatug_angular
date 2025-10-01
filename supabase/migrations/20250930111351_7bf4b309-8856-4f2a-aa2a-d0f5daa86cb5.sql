-- Create diagnostic function to check wallet vs transaction discrepancies
CREATE OR REPLACE FUNCTION public.diagnose_wallet_balance_discrepancy(p_user_id UUID)
RETURNS TABLE(
  wallet_id UUID,
  currency TEXT,
  wallet_table_balance NUMERIC,
  transactions_calculated_balance NUMERIC,
  discrepancy NUMERIC,
  needs_correction BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id AS wallet_id,
    w.currency,
    w.balance AS wallet_table_balance,
    COALESCE(
      (SELECT SUM(t.amount) 
       FROM transactions t 
       WHERE t.wallet_id = w.id 
         AND t.status = 'completed'
         AND t.approval_status IN ('approved', 'auto_approved')),
      0
    ) AS transactions_calculated_balance,
    w.balance - COALESCE(
      (SELECT SUM(t.amount) 
       FROM transactions t 
       WHERE t.wallet_id = w.id 
         AND t.status = 'completed'
         AND t.approval_status IN ('approved', 'auto_approved')),
      0
    ) AS discrepancy,
    ABS(w.balance - COALESCE(
      (SELECT SUM(t.amount) 
       FROM transactions t 
       WHERE t.wallet_id = w.id 
         AND t.status = 'completed'
         AND t.approval_status IN ('approved', 'auto_approved')),
      0
    )) > 0.01 AS needs_correction
  FROM wallets w
  WHERE w.user_id = p_user_id
  ORDER BY w.currency;
END;
$$;

-- Create function to reset wallet balance to match transactions (admin use only)
CREATE OR REPLACE FUNCTION public.reset_wallet_to_transaction_balance(p_wallet_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_calculated_balance NUMERIC;
  v_old_balance NUMERIC;
  v_wallet_currency TEXT;
  v_user_id UUID;
BEGIN
  -- Get wallet info
  SELECT balance, currency, user_id INTO v_old_balance, v_wallet_currency, v_user_id
  FROM wallets
  WHERE id = p_wallet_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Wallet not found'
    );
  END IF;
  
  -- Calculate balance from transactions
  v_calculated_balance := public.calculate_simple_wallet_balance(p_wallet_id);
  
  -- Update wallet balance
  UPDATE wallets
  SET balance = v_calculated_balance,
      updated_at = now()
  WHERE id = p_wallet_id;
  
  -- Log the correction in transactions table as a balance adjustment
  INSERT INTO transactions (
    user_id,
    wallet_id,
    amount,
    currency,
    transaction_type,
    status,
    approval_status,
    description,
    admin_notes
  ) VALUES (
    v_user_id,
    p_wallet_id,
    v_calculated_balance - v_old_balance,
    v_wallet_currency,
    'adjustment',
    'completed',
    'auto_approved',
    'Balance correction - syncing wallet to transaction history',
    jsonb_build_object(
      'old_balance', v_old_balance,
      'new_balance', v_calculated_balance,
      'adjustment_amount', v_calculated_balance - v_old_balance,
      'reason', 'Historical transaction reconciliation'
    )::text
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'wallet_id', p_wallet_id,
    'currency', v_wallet_currency,
    'old_balance', v_old_balance,
    'new_balance', v_calculated_balance,
    'adjustment', v_calculated_balance - v_old_balance
  );
END;
$$;
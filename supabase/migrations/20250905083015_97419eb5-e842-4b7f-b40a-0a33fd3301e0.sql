-- Phase 1: Database Audit & Correction

-- Create comprehensive transaction audit function
CREATE OR REPLACE FUNCTION audit_user_transactions(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wallet_transactions RECORD;
  share_transactions RECORD;
  result JSONB;
  ugx_balance NUMERIC := 0;
  usd_balance NUMERIC := 0;
  total_fees NUMERIC := 0;
BEGIN
  -- Calculate wallet transaction balance
  SELECT 
    COALESCE(SUM(CASE 
      WHEN transaction_type IN ('deposit', 'transfer_in') THEN amount
      WHEN transaction_type IN ('withdraw', 'withdrawal_request', 'transfer_out') THEN -amount - COALESCE(fee_amount, 0)
      ELSE 0
    END), 0) as ugx_total,
    COALESCE(SUM(CASE 
      WHEN currency = 'USD' AND transaction_type IN ('deposit', 'transfer_in') THEN amount
      WHEN currency = 'USD' AND transaction_type IN ('withdraw', 'withdrawal_request', 'transfer_out') THEN -amount - COALESCE(fee_amount, 0)
      ELSE 0
    END), 0) as usd_total,
    COALESCE(SUM(fee_amount), 0) as total_fee_amount
  INTO wallet_transactions
  FROM transactions 
  WHERE user_id = p_user_id AND status IN ('completed', 'approved');

  -- Calculate share transaction impact on wallets
  SELECT 
    COALESCE(SUM(CASE 
      WHEN currency = 'UGX' THEN -total_amount  -- Share purchases reduce wallet balance
      ELSE 0
    END), 0) as share_ugx_impact,
    COALESCE(SUM(CASE 
      WHEN currency = 'USD' THEN -total_amount
      ELSE 0  
    END), 0) as share_usd_impact
  INTO share_transactions
  FROM user_shares 
  WHERE user_id = p_user_id;

  -- Calculate final balances
  ugx_balance := COALESCE(wallet_transactions.ugx_total, 0) + COALESCE(share_transactions.share_ugx_impact, 0);
  usd_balance := COALESCE(wallet_transactions.usd_total, 0) + COALESCE(share_transactions.share_usd_impact, 0);
  total_fees := COALESCE(wallet_transactions.total_fee_amount, 0);

  -- Update actual wallet balances
  UPDATE wallets 
  SET balance = ugx_balance, updated_at = now()
  WHERE user_id = p_user_id AND currency = 'UGX';

  UPDATE wallets 
  SET balance = usd_balance, updated_at = now()
  WHERE user_id = p_user_id AND currency = 'USD';

  result := jsonb_build_object(
    'user_id', p_user_id,
    'ugx_balance', ugx_balance,
    'usd_balance', usd_balance,
    'total_fees_paid', total_fees,
    'wallet_transactions', wallet_transactions,
    'share_transactions', share_transactions
  );

  RETURN result;
END;
$$;

-- Create missing wallet transactions for historical share purchases
CREATE OR REPLACE FUNCTION create_missing_share_wallet_transactions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  share_record RECORD;
  wallet_id UUID;
  transaction_count INTEGER := 0;
  fee_amount NUMERIC;
BEGIN
  -- For each share purchase without corresponding wallet transaction
  FOR share_record IN 
    SELECT us.*, w.id as wallet_id
    FROM user_shares us
    LEFT JOIN wallets w ON w.user_id = us.user_id AND w.currency = us.currency
    LEFT JOIN transactions t ON t.reference = 'share_purchase_' || us.id::text
    WHERE t.id IS NULL
  LOOP
    -- Calculate fee (2.5% of total amount)
    fee_amount := share_record.total_amount * 0.025;
    
    -- Create wallet transaction for share purchase
    INSERT INTO transactions (
      user_id,
      wallet_id, 
      amount,
      currency,
      transaction_type,
      status,
      reference,
      fee_amount,
      created_at,
      updated_at
    ) VALUES (
      share_record.user_id,
      share_record.wallet_id,
      -(share_record.total_amount + fee_amount), -- Negative because it reduces wallet balance
      share_record.currency,
      'share_purchase',
      'completed',
      'share_purchase_' || share_record.id::text,
      fee_amount,
      share_record.created_at,
      share_record.updated_at
    );
    
    transaction_count := transaction_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'transactions_created', transaction_count,
    'message', 'Created missing wallet transactions for share purchases'
  );
END;
$$;

-- Unified fee calculation function
CREATE OR REPLACE FUNCTION calculate_unified_transaction_fee(
  p_transaction_type TEXT,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'UGX'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fee_percentage NUMERIC := 0;
  flat_fee NUMERIC := 0;
  calculated_fee NUMERIC := 0;
  min_fee NUMERIC := 0;
  max_fee NUMERIC := 0;
  final_fee NUMERIC := 0;
BEGIN
  -- Define fee structure based on transaction type
  CASE p_transaction_type
    WHEN 'deposit' THEN
      fee_percentage := 1.5;
      flat_fee := 5000;
      min_fee := 5000;
      max_fee := 50000;
    WHEN 'withdraw', 'withdrawal_request' THEN
      fee_percentage := 2.0;
      flat_fee := 10000;
      min_fee := 10000;
      max_fee := 100000;
    WHEN 'transfer', 'transfer_out' THEN
      fee_percentage := 1.0;
      flat_fee := 2500;
      min_fee := 2500;
      max_fee := 25000;
    WHEN 'share_purchase' THEN
      fee_percentage := 2.5;
      flat_fee := 0;
      min_fee := 1000;
      max_fee := 200000;
    WHEN 'share_sale' THEN
      fee_percentage := 3.0;
      flat_fee := 0;
      min_fee := 1500;
      max_fee := 250000;
    ELSE
      fee_percentage := 1.0;
      flat_fee := 1000;
  END CASE;

  -- Calculate fee
  calculated_fee := (p_amount * fee_percentage / 100) + flat_fee;
  
  -- Apply min/max limits
  final_fee := GREATEST(calculated_fee, min_fee);
  IF max_fee > 0 THEN
    final_fee := LEAST(final_fee, max_fee);
  END IF;

  RETURN jsonb_build_object(
    'fee_percentage', fee_percentage,
    'flat_fee', flat_fee,
    'calculated_fee', calculated_fee,
    'final_fee', final_fee,
    'min_fee', min_fee,
    'max_fee', max_fee
  );
END;
$$;

-- Fix existing fee calculations
UPDATE transactions 
SET fee_amount = (
  SELECT (calculate_unified_transaction_fee(transaction_type, ABS(amount), currency)->>'final_fee')::NUMERIC
)
WHERE fee_amount IS NULL OR fee_amount = 0;
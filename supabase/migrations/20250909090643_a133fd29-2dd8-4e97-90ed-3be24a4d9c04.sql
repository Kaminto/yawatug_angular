-- Enhanced wallet balance calculation function that handles fees and transaction types
CREATE OR REPLACE FUNCTION public.calculate_simple_wallet_balance(p_wallet_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  total_balance NUMERIC := 0;
  tx_record RECORD;
BEGIN
  -- Calculate balance with proper fee handling and transaction type logic
  FOR tx_record IN 
    SELECT 
      amount,
      transaction_type,
      fee_amount,
      status,
      approval_status
    FROM transactions 
    WHERE wallet_id = p_wallet_id 
      AND status = 'completed'
      AND (approval_status IN ('completed', 'approved') OR approval_status IS NULL)
  LOOP
    
    -- Handle different transaction types
    CASE 
      WHEN tx_record.transaction_type IN ('deposit', 'deposit_request', 'transfer_in', 'referral_commission') THEN
        -- Credit transactions: add amount (fees already handled by payment provider)
        total_balance := total_balance + COALESCE(tx_record.amount, 0);
        
      WHEN tx_record.transaction_type IN ('withdrawal', 'withdraw', 'share_purchase', 'transfer_out', 'fee_deduction') THEN
        -- Debit transactions: subtract amount and fees
        total_balance := total_balance + COALESCE(tx_record.amount, 0) - COALESCE(tx_record.fee_amount, 0);
        
      ELSE
        -- Default: add amount and subtract fees
        total_balance := total_balance + COALESCE(tx_record.amount, 0) - COALESCE(tx_record.fee_amount, 0);
    END CASE;
    
  END LOOP;
  
  RETURN total_balance;
END;
$function$;

-- Create a function to sync all wallet balances using the enhanced calculation
CREATE OR REPLACE FUNCTION public.sync_wallet_balance(p_wallet_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  calculated_balance NUMERIC;
  current_balance NUMERIC;
BEGIN
  -- Calculate the correct balance
  SELECT calculate_simple_wallet_balance(p_wallet_id) INTO calculated_balance;
  
  -- Get current stored balance
  SELECT balance INTO current_balance FROM wallets WHERE id = p_wallet_id;
  
  -- Update only if balance has changed
  IF current_balance != calculated_balance THEN
    UPDATE wallets 
    SET balance = calculated_balance, updated_at = now()
    WHERE id = p_wallet_id;
  END IF;
  
  RETURN calculated_balance;
END;
$function$;

-- Create a function to fix all wallet balances at once
CREATE OR REPLACE FUNCTION public.fix_all_wallet_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  wallet_record RECORD;
  updated_count INTEGER := 0;
  total_count INTEGER := 0;
  results jsonb := '[]'::jsonb;
BEGIN
  -- Loop through all wallets and sync their balances
  FOR wallet_record IN SELECT * FROM wallets ORDER BY currency, user_id LOOP
    total_count := total_count + 1;
    
    DECLARE
      old_balance NUMERIC := wallet_record.balance;
      new_balance NUMERIC;
    BEGIN
      -- Sync this wallet's balance
      SELECT sync_wallet_balance(wallet_record.id) INTO new_balance;
      
      -- Track updates
      IF old_balance != new_balance THEN
        updated_count := updated_count + 1;
        
        -- Add to results
        results := results || jsonb_build_object(
          'wallet_id', wallet_record.id,
          'user_id', wallet_record.user_id,
          'currency', wallet_record.currency,
          'old_balance', old_balance,
          'new_balance', new_balance,
          'difference', new_balance - old_balance
        );
      END IF;
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_wallets', total_count,
    'updated_wallets', updated_count,
    'unchanged_wallets', total_count - updated_count,
    'updates', results
  );
END;
$function$;
-- Ensure wallet updates from trusted functions bypass the manual update guard
CREATE OR REPLACE FUNCTION public.process_transaction_approval(p_transaction_id uuid, p_action text, p_admin_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  transaction_record RECORD;
  wallet_record RECORD;
  admin_fund_id UUID;
BEGIN
  -- Get transaction details
  SELECT * INTO transaction_record 
  FROM public.transactions 
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Get wallet details
  SELECT * INTO wallet_record 
  FROM public.wallets 
  WHERE id = transaction_record.wallet_id;
  
  IF p_action = 'approve' THEN
    -- Handle different transaction types
    CASE transaction_record.transaction_type
      WHEN 'deposit', 'deposit_request' THEN
        -- Add amount to user wallet (trusted update)
        PERFORM set_config('app.allow_wallet_update', 'true', true);
        UPDATE public.wallets 
        SET balance = balance + ABS(transaction_record.amount),
            updated_at = now()
        WHERE id = transaction_record.wallet_id;
        PERFORM set_config('app.allow_wallet_update', 'false', true);
        
      WHEN 'withdraw', 'withdrawal_request' THEN
        -- Amount was already deducted via transaction rows; no wallet change here
        NULL;
        
      WHEN 'share_purchase' THEN
        -- Allocate to project funding (admin_sub_wallets not affected by wallet guard)
        SELECT id INTO admin_fund_id 
        FROM public.admin_sub_wallets 
        WHERE wallet_type = 'project_funding' 
          AND currency = transaction_record.currency
        LIMIT 1;
        
        IF admin_fund_id IS NOT NULL THEN
          UPDATE public.admin_sub_wallets 
          SET balance = balance + ABS(transaction_record.amount) * 0.8, -- 80% to projects
              updated_at = now()
          WHERE id = admin_fund_id;
        END IF;
      ELSE
        -- Default handling
        NULL;
    END CASE;
    
    -- Update transaction status
    UPDATE public.transactions 
    SET approval_status = 'approved',
        status = 'completed',
        approved_at = now(),
        admin_notes = COALESCE(p_admin_notes, admin_notes)
    WHERE id = p_transaction_id;
    
  ELSIF p_action = 'reject' THEN
    -- Handle rejection - refund if needed
    IF transaction_record.transaction_type IN ('withdraw', 'withdrawal_request') THEN
      PERFORM set_config('app.allow_wallet_update', 'true', true);
      UPDATE public.wallets 
      SET balance = balance + ABS(transaction_record.amount),
          updated_at = now()
      WHERE id = transaction_record.wallet_id;
      PERFORM set_config('app.allow_wallet_update', 'false', true);
    END IF;
    
    -- Update transaction status
    UPDATE public.transactions 
    SET approval_status = 'rejected',
        status = 'failed',
        approved_at = now(),
        admin_notes = COALESCE(p_admin_notes, admin_notes)
    WHERE id = p_transaction_id;
  ELSE
    RAISE EXCEPTION 'Invalid action. Must be approve or reject';
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Update function to safely adjust recipient wallet balances
CREATE OR REPLACE FUNCTION public.update_recipient_wallet_balance(p_user_id uuid, p_currency text, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Allow trusted wallet update
  PERFORM set_config('app.allow_wallet_update', 'true', true);
  
  -- Update the wallet balance for the recipient
  UPDATE public.wallets 
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id 
    AND currency = p_currency;
  
  -- If no wallet was updated, it means the wallet doesn't exist
  IF NOT FOUND THEN
    -- Reset flag before raising
    PERFORM set_config('app.allow_wallet_update', 'false', true);
    RAISE EXCEPTION 'Recipient wallet not found for user % and currency %', p_user_id, p_currency;
  END IF;
  
  -- Reset trusted update flag
  PERFORM set_config('app.allow_wallet_update', 'false', true);
END;
$function$;

-- Ensure maintenance sync function can update wallets without being blocked
CREATE OR REPLACE FUNCTION public.sync_all_comprehensive_wallet_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  wallet_record RECORD;
  calculated_balance NUMERIC;
  updated_count INTEGER := 0;
  total_count INTEGER := 0;
  results jsonb := '[]'::jsonb;
BEGIN
  -- Allow updates during this maintenance routine
  PERFORM set_config('app.allow_wallet_update', 'true', true);

  -- Loop through all wallets
  FOR wallet_record IN SELECT * FROM wallets ORDER BY currency, user_id LOOP
    total_count := total_count + 1;
    
    -- Calculate comprehensive balance
    calculated_balance := calculate_comprehensive_wallet_balance(wallet_record.id);
    
    -- Update if different
    IF wallet_record.balance != calculated_balance THEN
      UPDATE wallets 
      SET balance = calculated_balance, updated_at = now()
      WHERE id = wallet_record.id;
      
      updated_count := updated_count + 1;
      
      -- Add to results
      results := results || jsonb_build_object(
        'wallet_id', wallet_record.id,
        'user_id', wallet_record.user_id,
        'currency', wallet_record.currency,
        'old_balance', wallet_record.balance,
        'new_balance', calculated_balance,
        'difference', calculated_balance - wallet_record.balance
      );
    END IF;
  END LOOP;
  
  -- Reset flag after processing
  PERFORM set_config('app.allow_wallet_update', 'false', true);
  
  RETURN jsonb_build_object(
    'success', true,
    'total_wallets', total_count,
    'updated_wallets', updated_count,
    'unchanged_wallets', total_count - updated_count,
    'updates', results
  );
END;
$function$;
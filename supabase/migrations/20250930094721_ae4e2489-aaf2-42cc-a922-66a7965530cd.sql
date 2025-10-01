-- Fixed: Backfill missing exchange transactions from completed exchange requests
CREATE OR REPLACE FUNCTION backfill_exchange_transactions()
RETURNS jsonb AS $$
DECLARE
  exchange_req RECORD;
  usd_wallet_id UUID;
  ugx_wallet_id UUID;
  transactions_created INTEGER := 0;
  total_usd_debited NUMERIC := 0;
  total_ugx_credited NUMERIC := 0;
  existing_transaction UUID;
BEGIN
  -- Get user's wallet IDs
  SELECT id INTO usd_wallet_id FROM wallets 
  WHERE user_id = '3378baf3-0b9c-4549-b5d6-7096f131f4c5' AND currency = 'USD';
  
  SELECT id INTO ugx_wallet_id FROM wallets 
  WHERE user_id = '3378baf3-0b9c-4549-b5d6-7096f131f4c5' AND currency = 'UGX';
  
  -- Loop through all completed exchange requests
  FOR exchange_req IN 
    SELECT * FROM currency_exchange_requests
    WHERE user_id = '3378baf3-0b9c-4549-b5d6-7096f131f4c5'
    AND status = 'completed'
    ORDER BY created_at
  LOOP
    -- Check if transactions already exist for this exchange
    SELECT id INTO existing_transaction FROM transactions
    WHERE reference = 'EXC-' || exchange_req.id::text
    LIMIT 1;
    
    -- Only create if they don't exist
    IF existing_transaction IS NULL THEN
      -- Create USD debit transaction (negative amount)
      INSERT INTO transactions (
        user_id, wallet_id, amount, currency, transaction_type,
        status, approval_status, reference, description, created_at, updated_at
      ) VALUES (
        '3378baf3-0b9c-4549-b5d6-7096f131f4c5',
        usd_wallet_id,
        -(exchange_req.from_amount),
        'USD',
        'exchange',
        'completed',
        'approved',
        'EXC-' || exchange_req.id::text,
        'Exchange ' || exchange_req.from_amount || ' USD to ' || exchange_req.to_amount || ' UGX',
        exchange_req.created_at,
        exchange_req.created_at
      );
      
      -- Create UGX credit transaction (positive amount)
      INSERT INTO transactions (
        user_id, wallet_id, amount, currency, transaction_type,
        status, approval_status, reference, description, created_at, updated_at
      ) VALUES (
        '3378baf3-0b9c-4549-b5d6-7096f131f4c5',
        ugx_wallet_id,
        exchange_req.to_amount,
        'UGX',
        'exchange',
        'completed',
        'approved',
        'EXC-' || exchange_req.id::text || '-REC',
        'Received ' || exchange_req.to_amount || ' UGX from ' || exchange_req.from_amount || ' USD exchange',
        exchange_req.created_at,
        exchange_req.created_at
      );
      
      transactions_created := transactions_created + 2;
      total_usd_debited := total_usd_debited + exchange_req.from_amount;
      total_ugx_credited := total_ugx_credited + exchange_req.to_amount;
    END IF;
    
    existing_transaction := NULL; -- Reset for next iteration
  END LOOP;
  
  -- Now sync wallet balances
  PERFORM sync_wallet_balance(usd_wallet_id);
  PERFORM sync_wallet_balance(ugx_wallet_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'transactions_created', transactions_created,
    'total_usd_debited', total_usd_debited,
    'total_ugx_credited', total_ugx_credited,
    'message', 'Successfully backfilled ' || transactions_created || ' exchange transactions'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the backfill
SELECT backfill_exchange_transactions();
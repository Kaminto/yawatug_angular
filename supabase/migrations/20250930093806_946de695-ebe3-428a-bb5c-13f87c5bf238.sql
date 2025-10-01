-- Update reconcile_exchange_transactions to set a secure search_path
CREATE OR REPLACE FUNCTION public.reconcile_exchange_transactions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  exchange_rec RECORD;
  source_wallet_rec RECORD;
  dest_wallet_rec RECORD;
  debit_exists BOOLEAN;
  credit_exists BOOLEAN;
  exchanges_processed INTEGER := 0;
  exchanges_skipped INTEGER := 0;
  result_details jsonb := '[]'::jsonb;
BEGIN
  -- Find all exchange transactions
  FOR exchange_rec IN 
    SELECT * FROM transactions 
    WHERE transaction_type = 'exchange'
    AND status IN ('pending', 'approved', 'completed')
    ORDER BY created_at ASC
  LOOP
    -- Get wallet info
    SELECT * INTO source_wallet_rec FROM wallets WHERE id = exchange_rec.wallet_id;
    
    -- Get destination wallet from metadata
    IF exchange_rec.metadata ? 'destination_wallet_id' THEN
      SELECT * INTO dest_wallet_rec FROM wallets 
      WHERE id = (exchange_rec.metadata->>'destination_wallet_id')::uuid;
    ELSE
      exchanges_skipped := exchanges_skipped + 1;
      CONTINUE;
    END IF;
    
    -- Check if debit transaction exists (negative amount in source currency)
    SELECT EXISTS(
      SELECT 1 FROM transactions 
      WHERE reference = exchange_rec.reference 
      AND amount < 0 
      AND currency = exchange_rec.currency
      AND transaction_type = 'exchange'
    ) INTO debit_exists;
    
    -- Check if credit transaction exists (positive amount in destination currency)
    SELECT EXISTS(
      SELECT 1 FROM transactions 
      WHERE reference LIKE exchange_rec.reference || '%'
      AND amount > 0 
      AND currency = (exchange_rec.metadata->>'to_currency')::text
      AND transaction_type = 'exchange'
    ) INTO credit_exists;
    
    -- Skip if both exist
    IF debit_exists AND credit_exists THEN
      exchanges_skipped := exchanges_skipped + 1;
      CONTINUE;
    END IF;
    
    -- Create missing transactions
    IF NOT debit_exists THEN
      INSERT INTO transactions (
        user_id, wallet_id, transaction_type, amount, currency,
        status, approval_status, description, reference,
        fee_amount, fee_percentage, flat_fee, metadata, created_at
      ) VALUES (
        exchange_rec.user_id,
        source_wallet_rec.id,
        'exchange',
        -(ABS(exchange_rec.amount) + COALESCE(exchange_rec.fee_amount, 0)),
        exchange_rec.currency,
        'completed',
        'approved',
        exchange_rec.description,
        exchange_rec.reference,
        exchange_rec.fee_amount,
        exchange_rec.fee_percentage,
        exchange_rec.flat_fee,
        jsonb_build_object(
          'direction', 'debit',
          'from_currency', exchange_rec.currency,
          'to_currency', exchange_rec.metadata->>'to_currency',
          'exchange_rate', exchange_rec.metadata->>'exchange_rate',
          'base_amount', ABS(exchange_rec.amount),
          'fee_amount', COALESCE(exchange_rec.fee_amount, 0),
          'converted_amount', exchange_rec.metadata->>'converted_amount',
          'destination_wallet_id', dest_wallet_rec.id,
          'backfilled', true
        ),
        exchange_rec.created_at
      );
    END IF;
    
    IF NOT credit_exists AND dest_wallet_rec.id IS NOT NULL THEN
      INSERT INTO transactions (
        user_id, wallet_id, transaction_type, amount, currency,
        status, approval_status, description, reference, metadata, created_at
      ) VALUES (
        exchange_rec.user_id,
        dest_wallet_rec.id,
        'exchange',
        (exchange_rec.metadata->>'converted_amount')::numeric,
        exchange_rec.metadata->>'to_currency',
        'completed',
        'approved',
        exchange_rec.description,
        exchange_rec.reference || '-REC',
        jsonb_build_object(
          'direction', 'credit',
          'from_currency', exchange_rec.currency,
          'to_currency', exchange_rec.metadata->>'to_currency',
          'exchange_rate', exchange_rec.metadata->>'exchange_rate',
          'source_wallet_id', source_wallet_rec.id,
          'base_amount', ABS(exchange_rec.amount),
          'backfilled', true
        ),
        exchange_rec.created_at
      );
    END IF;
    
    exchanges_processed := exchanges_processed + 1;
    
    result_details := result_details || jsonb_build_object(
      'reference', exchange_rec.reference,
      'from_currency', exchange_rec.currency,
      'to_currency', exchange_rec.metadata->>'to_currency',
      'amount', ABS(exchange_rec.amount),
      'created_debit', NOT debit_exists,
      'created_credit', NOT credit_exists
    );
  END LOOP;
  
  -- Sync all wallet balances
  PERFORM sync_wallet_balance(id) FROM wallets;
  
  RETURN jsonb_build_object(
    'success', true,
    'exchanges_processed', exchanges_processed,
    'exchanges_skipped', exchanges_skipped,
    'details', result_details,
    'message', 'Exchange reconciliation completed and wallet balances synced'
  );
END;
$$;
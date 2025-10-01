-- Create a function to validate and create transactions atomically
CREATE OR REPLACE FUNCTION public.create_validated_transaction(
  p_user_id UUID,
  p_wallet_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_transaction_type TEXT,
  p_status TEXT DEFAULT 'pending',
  p_approval_status TEXT DEFAULT 'pending',
  p_description TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_fee_amount NUMERIC DEFAULT 0,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_current_balance NUMERIC;
  v_total_debit NUMERIC;
BEGIN
  -- Calculate current balance from transactions
  SELECT COALESCE(
    (SELECT public.calculate_simple_wallet_balance(p_wallet_id)),
    0
  ) INTO v_current_balance;
  
  -- For debit transactions (negative amounts), validate sufficient balance
  IF p_amount < 0 THEN
    v_total_debit := ABS(p_amount) + COALESCE(p_fee_amount, 0);
    
    IF v_current_balance < v_total_debit THEN
      RAISE EXCEPTION 'Insufficient balance. Required: % %, Available: % %', 
        v_total_debit, p_currency, v_current_balance, p_currency;
    END IF;
  END IF;
  
  -- Create the transaction
  INSERT INTO public.transactions (
    user_id,
    wallet_id,
    amount,
    currency,
    transaction_type,
    status,
    approval_status,
    description,
    reference,
    fee_amount,
    metadata
  ) VALUES (
    p_user_id,
    p_wallet_id,
    p_amount,
    p_currency,
    p_transaction_type,
    p_status,
    p_approval_status,
    p_description,
    COALESCE(p_reference, 'TXN-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || substr(gen_random_uuid()::text, 1, 8)),
    p_fee_amount,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;
  
  -- Sync wallet balance
  PERFORM public.sync_wallet_balance(p_wallet_id);
  
  RETURN v_transaction_id;
END;
$$;

-- Create a function specifically for exchange transactions with dual-wallet validation
CREATE OR REPLACE FUNCTION public.create_exchange_transaction(
  p_user_id UUID,
  p_from_wallet_id UUID,
  p_to_wallet_id UUID,
  p_from_amount NUMERIC,
  p_to_amount NUMERIC,
  p_from_currency TEXT,
  p_to_currency TEXT,
  p_exchange_rate NUMERIC,
  p_fee_amount NUMERIC DEFAULT 0,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_from_balance NUMERIC;
  v_total_required NUMERIC;
  v_debit_txn_id UUID;
  v_credit_txn_id UUID;
  v_exchange_ref TEXT;
BEGIN
  -- Validate source wallet balance
  SELECT COALESCE(
    (SELECT public.calculate_simple_wallet_balance(p_from_wallet_id)),
    0
  ) INTO v_from_balance;
  
  v_total_required := p_from_amount + COALESCE(p_fee_amount, 0);
  
  IF v_from_balance < v_total_required THEN
    RAISE EXCEPTION 'Insufficient balance for exchange. Required: % %, Available: % %',
      v_total_required, p_from_currency, v_from_balance, p_from_currency;
  END IF;
  
  -- Generate exchange reference
  v_exchange_ref := 'EXC-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || substr(p_user_id::text, 1, 8);
  
  -- Create debit transaction (source currency)
  INSERT INTO public.transactions (
    user_id, wallet_id, amount, currency, transaction_type,
    status, approval_status, reference, fee_amount,
    description, metadata
  ) VALUES (
    p_user_id, p_from_wallet_id, -(p_from_amount), p_from_currency, 'exchange',
    'completed', 'approved', v_exchange_ref, p_fee_amount,
    COALESCE(p_description, 'Currency exchange ' || p_from_currency || ' to ' || p_to_currency),
    jsonb_build_object(
      'to_currency', p_to_currency,
      'exchange_rate', p_exchange_rate,
      'converted_amount', p_to_amount
    )
  )
  RETURNING id INTO v_debit_txn_id;
  
  -- Create credit transaction (target currency)
  INSERT INTO public.transactions (
    user_id, wallet_id, amount, currency, transaction_type,
    status, approval_status, reference,
    description, metadata
  ) VALUES (
    p_user_id, p_to_wallet_id, p_to_amount, p_to_currency, 'exchange',
    'completed', 'approved', v_exchange_ref || '-REC',
    COALESCE(p_description, 'Currency exchange from ' || p_from_currency),
    jsonb_build_object(
      'from_currency', p_from_currency,
      'exchange_rate', p_exchange_rate,
      'source_amount', p_from_amount
    )
  )
  RETURNING id INTO v_credit_txn_id;
  
  -- Sync both wallet balances
  PERFORM public.sync_wallet_balance(p_from_wallet_id);
  PERFORM public.sync_wallet_balance(p_to_wallet_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'debit_transaction_id', v_debit_txn_id,
    'credit_transaction_id', v_credit_txn_id,
    'exchange_reference', v_exchange_ref
  );
END;
$$;
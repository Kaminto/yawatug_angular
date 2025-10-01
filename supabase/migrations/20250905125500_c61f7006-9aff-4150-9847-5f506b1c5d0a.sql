-- Update the allocate_transaction_fee_enhanced function to properly set admin_fund_allocated
CREATE OR REPLACE FUNCTION public.allocate_transaction_fee_enhanced(p_transaction_id uuid, p_user_id uuid, p_transaction_type text, p_base_amount numeric, p_fee_amount numeric, p_currency text DEFAULT 'UGX'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  admin_fund_id UUID;
  fee_collection_id UUID;
  current_balance NUMERIC;
BEGIN
  -- Get the admin fund wallet ID
  SELECT id INTO admin_fund_id 
  FROM public.admin_sub_wallets 
  WHERE wallet_type = 'admin_fund' AND currency = p_currency
  LIMIT 1;
  
  IF admin_fund_id IS NULL THEN
    RAISE EXCEPTION 'Admin fund wallet not found for currency %', p_currency;
  END IF;

  -- Get current balance for logging
  SELECT balance INTO current_balance 
  FROM public.admin_sub_wallets 
  WHERE id = admin_fund_id;

  -- Record the fee collection with proper admin_fund_allocated
  INSERT INTO public.transaction_fee_collections (
    transaction_id,
    user_id,
    transaction_type,
    base_amount,
    calculated_fee,
    actual_fee_collected,
    currency,
    allocation_status,
    fee_collection_reference,
    admin_fund_allocated
  ) VALUES (
    p_transaction_id,
    p_user_id,
    p_transaction_type,
    p_base_amount,
    p_fee_amount,
    p_fee_amount,
    p_currency,
    'allocated',
    'FEE-' || p_transaction_id,
    p_fee_amount  -- CRITICAL: Set the allocated amount
  ) RETURNING id INTO fee_collection_id;
  
  -- Allocate fee to admin fund
  UPDATE public.admin_sub_wallets 
  SET balance = balance + p_fee_amount,
      updated_at = now()
  WHERE id = admin_fund_id;
  
  -- Record the transfer in admin_wallet_fund_transfers
  INSERT INTO public.admin_wallet_fund_transfers (
    to_wallet_id,
    amount,
    currency,
    transfer_type,
    description,
    reference,
    status
  ) VALUES (
    admin_fund_id,
    p_fee_amount,
    p_currency,
    'fee_allocation',
    'Transaction fee allocation from ' || p_transaction_type,
    p_transaction_id::TEXT,
    'completed'
  );

  RETURN fee_collection_id;
END;
$function$;
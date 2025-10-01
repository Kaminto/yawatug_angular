
-- Create the missing transfer_admin_funds function
CREATE OR REPLACE FUNCTION public.transfer_admin_funds(
  p_from_wallet_id UUID,
  p_to_wallet_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  from_balance NUMERIC;
  to_balance NUMERIC;
BEGIN
  -- Check source wallet balance
  SELECT balance INTO from_balance 
  FROM public.admin_sub_wallets 
  WHERE id = p_from_wallet_id;
  
  IF from_balance IS NULL THEN
    RAISE EXCEPTION 'Source wallet not found';
  END IF;
  
  IF from_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance in source wallet';
  END IF;
  
  -- Get destination wallet balance
  SELECT balance INTO to_balance 
  FROM public.admin_sub_wallets 
  WHERE id = p_to_wallet_id;
  
  IF to_balance IS NULL THEN
    RAISE EXCEPTION 'Destination wallet not found';
  END IF;
  
  -- Update source wallet
  UPDATE public.admin_sub_wallets 
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE id = p_from_wallet_id;
  
  -- Update destination wallet
  UPDATE public.admin_sub_wallets 
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE id = p_to_wallet_id;
  
  -- Record the transfer
  INSERT INTO public.admin_wallet_fund_transfers (
    from_wallet_id,
    to_wallet_id,
    amount,
    transfer_type,
    description,
    reference,
    created_by
  ) VALUES (
    p_from_wallet_id,
    p_to_wallet_id,
    p_amount,
    'manual',
    p_description,
    p_reference,
    p_created_by
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

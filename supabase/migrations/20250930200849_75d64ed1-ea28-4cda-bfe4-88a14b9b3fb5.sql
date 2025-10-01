-- Secure wallet balance calculation that validates user ownership
-- This prevents users from calculating balances for wallets they don't own

CREATE OR REPLACE FUNCTION public.calculate_simple_wallet_balance(p_wallet_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  total_balance NUMERIC := 0;
  wallet_user_id UUID;
BEGIN
  -- First verify the wallet belongs to the requesting user
  SELECT user_id INTO wallet_user_id
  FROM wallets
  WHERE id = p_wallet_id;
  
  -- If wallet not found or doesn't belong to user, return 0
  IF wallet_user_id IS NULL OR wallet_user_id != auth.uid() THEN
    RETURN 0;
  END IF;
  
  -- Calculate balance by summing all completed and approved transactions
  -- for this specific user's wallet
  SELECT COALESCE(SUM(amount - COALESCE(fee_amount, 0)), 0)
  INTO total_balance
  FROM transactions 
  WHERE wallet_id = p_wallet_id 
    AND user_id = wallet_user_id  -- Extra security: verify user_id matches
    AND status = 'completed'
    AND (approval_status IN ('completed', 'approved') OR approval_status IS NULL);
  
  RETURN total_balance;
END;
$function$;

-- Update sync function to also validate user ownership
CREATE OR REPLACE FUNCTION public.sync_wallet_balance(p_wallet_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  calculated_balance NUMERIC;
  current_balance NUMERIC;
  wallet_user_id UUID;
BEGIN
  -- Verify wallet belongs to requesting user
  SELECT user_id INTO wallet_user_id
  FROM wallets
  WHERE id = p_wallet_id;
  
  -- Only allow users to sync their own wallets
  IF wallet_user_id IS NULL OR wallet_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot sync wallet that does not belong to you';
  END IF;
  
  -- Calculate the correct balance
  SELECT calculate_simple_wallet_balance(p_wallet_id) INTO calculated_balance;
  
  -- Get current stored balance
  SELECT balance INTO current_balance FROM wallets WHERE id = p_wallet_id;
  
  -- Update only if balance has changed
  IF current_balance != calculated_balance THEN
    UPDATE wallets 
    SET balance = calculated_balance, updated_at = now()
    WHERE id = p_wallet_id AND user_id = auth.uid();
  END IF;
  
  RETURN calculated_balance;
END;
$function$;

-- Update the breakdown function to also validate user ownership
CREATE OR REPLACE FUNCTION public.get_wallet_balance_breakdown(p_wallet_id uuid)
RETURNS TABLE(
  transaction_type text,
  transaction_count bigint,
  total_amount numeric,
  total_fees numeric,
  net_impact numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  wallet_user_id UUID;
BEGIN
  -- Verify wallet belongs to requesting user
  SELECT user_id INTO wallet_user_id
  FROM wallets
  WHERE id = p_wallet_id;
  
  -- Only allow users to view breakdown of their own wallets
  IF wallet_user_id IS NULL OR wallet_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot view wallet breakdown that does not belong to you';
  END IF;
  
  RETURN QUERY
  SELECT 
    t.transaction_type,
    COUNT(*)::bigint as transaction_count,
    COALESCE(SUM(t.amount), 0) as total_amount,
    COALESCE(SUM(t.fee_amount), 0) as total_fees,
    COALESCE(SUM(t.amount - COALESCE(t.fee_amount, 0)), 0) as net_impact
  FROM transactions t
  WHERE t.wallet_id = p_wallet_id
    AND t.user_id = wallet_user_id  -- Extra security check
    AND t.status = 'completed'
    AND (t.approval_status IN ('completed', 'approved') OR t.approval_status IS NULL)
  GROUP BY t.transaction_type
  ORDER BY t.transaction_type;
END;
$function$;
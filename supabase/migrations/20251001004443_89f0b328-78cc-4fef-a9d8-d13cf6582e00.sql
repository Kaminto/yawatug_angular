-- Fix wallet balance update function to respect manual update prevention trigger
CREATE OR REPLACE FUNCTION public.update_wallet_balance_from_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_wallet_id UUID;
  calculated_balance NUMERIC := 0;
BEGIN
  -- Determine the affected wallet id
  v_wallet_id := COALESCE(NEW.wallet_id, OLD.wallet_id);
  IF v_wallet_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate balance from all approved/completed transactions
  SELECT COALESCE(SUM(amount), 0) INTO calculated_balance
  FROM transactions
  WHERE wallet_id = v_wallet_id
    AND status IN ('completed', 'processing')
    AND approval_status IN ('approved', 'completed');

  -- Temporarily allow wallet balance update within this function
  PERFORM set_config('app.allow_wallet_update', 'true', true);

  -- Update wallet balance
  UPDATE wallets
  SET balance = calculated_balance,
      updated_at = now()
  WHERE id = v_wallet_id;

  -- Reset the flag
  PERFORM set_config('app.allow_wallet_update', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$$;
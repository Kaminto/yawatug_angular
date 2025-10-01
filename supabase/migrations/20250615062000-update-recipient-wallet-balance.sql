
-- Create a security definer function to update recipient wallet balances
CREATE OR REPLACE FUNCTION public.update_recipient_wallet_balance(
  p_user_id UUID,
  p_currency TEXT,
  p_amount NUMERIC
) RETURNS VOID AS $$
BEGIN
  -- Update the wallet balance for the recipient
  UPDATE public.wallets 
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id 
    AND currency = p_currency;
  
  -- If no wallet was updated, it means the wallet doesn't exist
  -- This shouldn't happen if create_recipient_wallet was called first
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipient wallet not found for user % and currency %', p_user_id, p_currency;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

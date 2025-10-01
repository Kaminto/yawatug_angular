
-- Create the update_recipient_wallet_balance function that's being called in the transfer code
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

-- Enable realtime for wallets table for real-time balance updates
ALTER TABLE public.wallets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;

-- Enable realtime for transactions table for real-time transaction updates
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

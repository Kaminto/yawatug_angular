
-- Create a security definer function to get wallet ID for transfers
CREATE OR REPLACE FUNCTION public.get_user_wallet_id(
  p_user_id UUID,
  p_currency TEXT
) RETURNS UUID AS $$
DECLARE
  wallet_id UUID;
BEGIN
  -- Get the wallet ID for the specified user and currency
  SELECT id INTO wallet_id
  FROM public.wallets 
  WHERE user_id = p_user_id 
    AND currency = p_currency;
  
  RETURN wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

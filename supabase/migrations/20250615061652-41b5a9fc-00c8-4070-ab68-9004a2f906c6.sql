
-- Create a security definer function to create wallets for recipients during transfers
CREATE OR REPLACE FUNCTION public.create_recipient_wallet(
  p_user_id UUID,
  p_currency TEXT
) RETURNS UUID AS $$
DECLARE
  wallet_id UUID;
BEGIN
  -- Insert the new wallet
  INSERT INTO public.wallets (user_id, currency, balance, status)
  VALUES (p_user_id, p_currency, 0, 'active')
  RETURNING id INTO wallet_id;
  
  RETURN wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for wallets table if they don't exist
DO $$
BEGIN
  -- Enable RLS on wallets table
  ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies if they exist to avoid conflicts
  DROP POLICY IF EXISTS "Users can view their own wallets" ON public.wallets;
  DROP POLICY IF EXISTS "Users can create their own wallets" ON public.wallets;
  DROP POLICY IF EXISTS "Users can update their own wallets" ON public.wallets;
  
  -- Create policy for users to view their own wallets
  CREATE POLICY "Users can view their own wallets" 
    ON public.wallets 
    FOR SELECT 
    USING (auth.uid() = user_id);
  
  -- Create policy for users to create their own wallets
  CREATE POLICY "Users can create their own wallets" 
    ON public.wallets 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  
  -- Create policy for users to update their own wallets
  CREATE POLICY "Users can update their own wallets" 
    ON public.wallets 
    FOR UPDATE 
    USING (auth.uid() = user_id);
    
  -- Create policy for the system to create wallets during transfers
  CREATE POLICY "System can create wallets for transfers" 
    ON public.wallets 
    FOR INSERT 
    WITH CHECK (true);

EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists, ignore
END $$;

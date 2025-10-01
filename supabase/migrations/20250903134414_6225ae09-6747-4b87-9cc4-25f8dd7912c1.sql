-- Manually calculate referral commissions for existing transactions
-- This will help Nandudu see her expected earnings from Guga Jayden's transaction

-- For testing purposes, let's manually insert a commission record for Nandudu
-- First, get Nandudu's user ID and her referral's transaction
DO $$
DECLARE
  nandudu_id UUID;
  guga_id UUID;
  deposit_transaction_id UUID;
  commission_amount NUMERIC;
BEGIN
  -- Get Nandudu's user ID
  SELECT id INTO nandudu_id 
  FROM public.profiles 
  WHERE email = 'nandudu@gmail.com';
  
  -- Get Guga Jayden's user ID
  SELECT id INTO guga_id 
  FROM public.profiles 
  WHERE full_name ILIKE '%guga%' AND referred_by = nandudu_id;
  
  -- Get Guga's deposit transaction
  SELECT id INTO deposit_transaction_id
  FROM public.transactions 
  WHERE user_id = guga_id 
    AND transaction_type = 'deposit' 
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If we found the transaction, create commission record
  IF deposit_transaction_id IS NOT NULL THEN
    -- Calculate 5% commission on UGX 1,500,000
    commission_amount := 1500000 * 0.05; -- 75,000 UGX
    
    INSERT INTO public.referral_commissions (
      referrer_id,
      referred_id,
      transaction_id,
      commission_amount,
      commission_rate,
      source_amount,
      earning_type,
      status
    ) VALUES (
      nandudu_id,
      guga_id,
      deposit_transaction_id,
      commission_amount,
      0.05,
      1500000,
      'share_purchase',
      'pending'
    ) ON CONFLICT DO NOTHING; -- Prevent duplicates
    
    RAISE NOTICE 'Created referral commission for Nandudu: UGX %', commission_amount;
  ELSE
    RAISE NOTICE 'No qualifying transaction found for Guga Jayden';
  END IF;
END $$;
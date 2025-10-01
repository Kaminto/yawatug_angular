-- Create the process_signup_referral function and fix existing referral data
CREATE OR REPLACE FUNCTION public.process_signup_referral(
  p_referred_user_id UUID,
  p_referral_code TEXT
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  referrer_user_id UUID;
  referred_user_record RECORD;
BEGIN
  -- Find the user who owns this referral code
  SELECT id INTO referrer_user_id 
  FROM public.profiles 
  WHERE referral_code = p_referral_code;
  
  IF referrer_user_id IS NULL THEN
    RAISE NOTICE 'Referral code % not found', p_referral_code;
    RETURN;
  END IF;
  
  -- Don't allow self-referral
  IF referrer_user_id = p_referred_user_id THEN
    RAISE NOTICE 'Self-referral not allowed';
    RETURN;
  END IF;
  
  -- Get referred user details
  SELECT * INTO referred_user_record 
  FROM public.profiles 
  WHERE id = p_referred_user_id;
  
  IF referred_user_record IS NULL THEN
    RAISE NOTICE 'Referred user % not found', p_referred_user_id;
    RETURN;
  END IF;
  
  -- Update the referred user's referred_by field
  UPDATE public.profiles 
  SET referred_by = referrer_user_id,
      updated_at = now()
  WHERE id = p_referred_user_id;
  
  -- Create referral activity record
  INSERT INTO public.referral_activities (
    referrer_id,
    referred_id,
    referral_code_used,
    activity_type,
    status,
    commission_earned,
    created_at
  ) VALUES (
    referrer_user_id,
    p_referred_user_id,
    p_referral_code,
    'signup',
    'processed',
    0, -- No commission for just signing up
    now()
  );
  
  -- Update referrer statistics
  INSERT INTO public.referral_statistics (
    user_id,
    total_referrals,
    successful_referrals,
    total_earnings,
    pending_earnings,
    updated_at
  ) VALUES (
    referrer_user_id,
    1,
    1,
    0,
    0,
    now()
  ) ON CONFLICT (user_id) DO UPDATE SET
    total_referrals = referral_statistics.total_referrals + 1,
    successful_referrals = referral_statistics.successful_referrals + 1,
    updated_at = now();
    
  RAISE NOTICE 'Successfully processed referral: % -> %', p_referral_code, p_referred_user_id;
END;
$$;

-- Create trigger function for referral commissions on share purchases
CREATE OR REPLACE FUNCTION public.process_referral_commission()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  referred_user_record RECORD;
  referrer_user_id UUID;
  commission_amount NUMERIC;
  commission_rate NUMERIC := 0.05; -- 5% commission
BEGIN
  -- Only process completed share purchase transactions
  IF NEW.status != 'completed' OR NEW.transaction_type != 'share_purchase' THEN
    RETURN NEW;
  END IF;
  
  -- Get the user who made the transaction
  SELECT * INTO referred_user_record 
  FROM public.profiles 
  WHERE id = NEW.user_id;
  
  -- Check if this user was referred by someone
  IF referred_user_record.referred_by IS NULL THEN
    RETURN NEW;
  END IF;
  
  referrer_user_id := referred_user_record.referred_by;
  commission_amount := ABS(NEW.amount) * commission_rate;
  
  -- Record the commission earning
  INSERT INTO public.referral_earnings (
    referrer_id,
    referred_id,
    transaction_id,
    commission_amount,
    commission_rate,
    transaction_amount,
    earning_type,
    status,
    created_at
  ) VALUES (
    referrer_user_id,
    NEW.user_id,
    NEW.id,
    commission_amount,
    commission_rate,
    ABS(NEW.amount),
    'share_purchase_commission',
    'earned',
    now()
  );
  
  -- Create referral activity record
  INSERT INTO public.referral_activities (
    referrer_id,
    referred_id,
    activity_type,
    status,
    commission_earned,
    transaction_reference,
    created_at
  ) VALUES (
    referrer_user_id,
    NEW.user_id,
    'share_purchase',
    'processed',
    commission_amount,
    NEW.id::TEXT,
    now()
  );
  
  -- Update referrer statistics
  UPDATE public.referral_statistics 
  SET 
    total_earnings = total_earnings + commission_amount,
    pending_earnings = pending_earnings + commission_amount,
    updated_at = now()
  WHERE user_id = referrer_user_id;
  
  RETURN NEW;
END;
$$;

-- Create the trigger for referral commissions
DROP TRIGGER IF EXISTS process_referral_commission_trigger ON public.transactions;
CREATE TRIGGER process_referral_commission_trigger
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_referral_commission();

-- Fix missing referral data by checking if users need to be assigned to referrers
-- This is a one-time fix for existing data
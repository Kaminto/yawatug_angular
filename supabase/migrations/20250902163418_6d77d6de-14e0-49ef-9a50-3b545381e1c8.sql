-- Fix security issue with the new function - add proper search_path
CREATE OR REPLACE FUNCTION public.process_signup_referral(
  p_user_id uuid,
  p_referral_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id uuid;
  result jsonb;
BEGIN
  -- If no referral code provided, nothing to do
  IF p_referral_code IS NULL OR p_referral_code = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'No referral code provided');
  END IF;
  
  -- Find the referrer by referral code
  SELECT id INTO referrer_id
  FROM public.profiles 
  WHERE referral_code = p_referral_code
  AND id != p_user_id  -- Can't refer yourself
  LIMIT 1;
  
  -- If referrer not found, return false
  IF referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Referral code not found');
  END IF;
  
  -- Update the user's referred_by field
  UPDATE public.profiles 
  SET referred_by = referrer_id,
      updated_at = now()
  WHERE id = p_user_id;
  
  -- Create referral activity record
  INSERT INTO public.referral_activities (
    referrer_id,
    referred_id,
    activity_type,
    status,
    commission_earned,
    created_at
  ) VALUES (
    referrer_id,
    p_user_id,
    'signup',
    'processed',
    0,  -- Commission can be calculated later
    now()
  );
  
  -- Update referrer's statistics
  INSERT INTO public.referral_statistics (
    user_id,
    total_referrals,
    successful_referrals,
    total_earnings,
    pending_earnings,
    tier,
    tier_progress,
    next_tier_threshold,
    current_rank,
    lifetime_value,
    updated_at,
    created_at,
    last_activity_at
  ) VALUES (
    referrer_id,
    1,
    1,
    0,
    0,
    'bronze',
    10,
    10,
    1,
    0,
    now(),
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_referrals = referral_statistics.total_referrals + 1,
    successful_referrals = referral_statistics.successful_referrals + 1,
    tier_progress = referral_statistics.tier_progress + 10,
    updated_at = now(),
    last_activity_at = now();
    
  RETURN jsonb_build_object('success', true, 'message', 'Referral processed successfully', 'referrer_id', referrer_id);
END;
$$;
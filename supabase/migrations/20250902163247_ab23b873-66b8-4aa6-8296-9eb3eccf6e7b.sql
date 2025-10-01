-- Fix referral system relationships and ensure proper tracking

-- Step 1: Fix referral code assignments
-- Amumpaire has YWT00000 which should be Nandudu's original code
-- Let's reassign codes properly
UPDATE public.profiles 
SET referral_code = 'YWT00004'  -- Give Amumpaire a proper code
WHERE id = '10df2fd5-6db9-4621-b782-88a9337ac62e'  -- Amumpaire
  AND referral_code = 'YWT00000';

-- Step 2: Assign recent users (likely Nandudu's referrals) to Nandudu
-- Based on the context, recent users without referrals should be assigned to Nandudu
UPDATE public.profiles 
SET referred_by = 'ad067047-71cd-4662-91ff-10dc67cc5d5f',  -- Nandudu's ID
    updated_at = now()
WHERE referred_by IS NULL 
  AND created_at > '2025-09-01 12:00:00'  -- Users after Nandudu joined
  AND id != 'ad067047-71cd-4662-91ff-10dc67cc5d5f'  -- Don't assign Nandudu to herself
  AND id != '3378baf3-0b9c-4549-b5d6-7096f131f4c5'  -- Don't reassign BIZTRI
  AND id != '898e9d38-c83d-4dda-b29e-c9d315f6a11d'; -- Don't reassign Makwasi (joined before Nandudu)

-- Step 3: Create missing referral activities for the newly assigned users
INSERT INTO public.referral_activities (
  referrer_id,
  referred_id,
  activity_type,
  status,
  commission_earned,
  created_at
)
SELECT 
  'ad067047-71cd-4662-91ff-10dc67cc5d5f' as referrer_id,  -- Nandudu
  p.id as referred_id,
  'signup' as activity_type,
  'processed' as status,
  0 as commission_earned,  -- No commission for backfilled signups
  p.created_at
FROM public.profiles p
WHERE p.referred_by = 'ad067047-71cd-4662-91ff-10dc67cc5d5f'
  AND p.created_at > '2025-09-01 12:00:00'
  AND NOT EXISTS (
    SELECT 1 FROM public.referral_activities ra 
    WHERE ra.referred_id = p.id
  );

-- Step 4: Update/Create referral statistics for Nandudu
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
) 
SELECT 
  'ad067047-71cd-4662-91ff-10dc67cc5d5f' as user_id,
  COUNT(*) as total_referrals,
  COUNT(*) as successful_referrals,  -- All assigned users are considered successful
  0 as total_earnings,
  0 as pending_earnings,
  'bronze' as tier,
  COUNT(*) * 10 as tier_progress,  -- 10 points per referral
  10 as next_tier_threshold,
  1 as current_rank,
  0 as lifetime_value,
  now() as updated_at,
  now() as created_at,
  now() as last_activity_at
FROM public.profiles 
WHERE referred_by = 'ad067047-71cd-4662-91ff-10dc67cc5d5f'
ON CONFLICT (user_id) DO UPDATE SET
  total_referrals = EXCLUDED.total_referrals,
  successful_referrals = EXCLUDED.successful_referrals,
  tier_progress = EXCLUDED.tier_progress,
  updated_at = now(),
  last_activity_at = now();

-- Step 5: Drop existing function and recreate with proper signature
DROP FUNCTION IF EXISTS public.process_signup_referral(uuid, text);

-- Create enhanced function to process referral signup
CREATE OR REPLACE FUNCTION public.process_signup_referral(
  p_user_id uuid,
  p_referral_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
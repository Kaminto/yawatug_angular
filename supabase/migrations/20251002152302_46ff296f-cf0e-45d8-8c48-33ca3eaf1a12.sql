-- Fix referral processing to use profiles table instead of referral_codes

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.process_signup_referral(uuid, text);

-- Recreate the function with correct table references
CREATE OR REPLACE FUNCTION public.process_signup_referral(p_user_id uuid, p_referral_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  referrer_id UUID;
  result JSONB;
BEGIN
  -- Find the referrer by referral code from profiles table (NOT referral_codes)
  SELECT id INTO referrer_id
  FROM public.profiles
  WHERE referral_code = p_referral_code
  AND id != p_user_id;  -- Prevent self-referral
  
  IF referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid referral code'
    );
  END IF;
  
  -- Update the referred user's profile with referrer info
  UPDATE public.profiles
  SET referred_by = referrer_id
  WHERE id = p_user_id;
  
  -- Create referral activity record
  INSERT INTO public.referral_activities (
    referrer_id,
    referred_id,
    activity_type,
    created_at
  ) VALUES (
    referrer_id,
    p_user_id,
    'signup',
    NOW()
  );
  
  -- Update referrer's statistics
  INSERT INTO public.referral_statistics (
    user_id,
    total_referrals,
    successful_referrals,
    created_at,
    updated_at
  ) VALUES (
    referrer_id,
    1,
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_referrals = referral_statistics.total_referrals + 1,
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', referrer_id,
    'message', 'Referral processed successfully'
  );
END;
$function$;

-- Ensure there are no triggers referencing the old referral_codes table
-- (This is just a safety check - if there are any triggers, they would need to be dropped manually)
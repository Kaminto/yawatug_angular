-- Assign recent users without referrals to Nandudu (who likely had YWT00000 originally)
-- This is a manual fix based on the context that Nandudu's referrals were not being tracked

-- First, let's assign the recent users to Nandudu
UPDATE public.profiles 
SET referred_by = 'ad067047-71cd-4662-91ff-10dc67cc5d5f',
    updated_at = now()
WHERE referred_by IS NULL 
  AND created_at > '2025-01-01'
  AND id != 'ad067047-71cd-4662-91ff-10dc67cc5d5f'; -- Don't assign Nandudu to herself

-- Create referral activities for these users
INSERT INTO public.referral_activities (
  referrer_id,
  referred_id,
  referral_code_used,
  activity_type,
  status,
  commission_earned,
  created_at
)
SELECT 
  'ad067047-71cd-4662-91ff-10dc67cc5d5f' as referrer_id,
  p.id as referred_id,
  'YWT00000' as referral_code_used,
  'signup' as activity_type,
  'processed' as status,
  0 as commission_earned,
  p.created_at
FROM public.profiles p
WHERE p.referred_by = 'ad067047-71cd-4662-91ff-10dc67cc5d5f'
  AND p.created_at > '2025-01-01';

-- Update Nandudu's referral statistics
INSERT INTO public.referral_statistics (
  user_id,
  total_referrals,
  successful_referrals,
  total_earnings,
  pending_earnings,
  updated_at
) 
SELECT 
  'ad067047-71cd-4662-91ff-10dc67cc5d5f' as user_id,
  COUNT(*) as total_referrals,
  COUNT(*) as successful_referrals,
  0 as total_earnings,
  0 as pending_earnings,
  now() as updated_at
FROM public.profiles 
WHERE referred_by = 'ad067047-71cd-4662-91ff-10dc67cc5d5f'
ON CONFLICT (user_id) DO UPDATE SET
  total_referrals = EXCLUDED.total_referrals,
  successful_referrals = EXCLUDED.successful_referrals,
  updated_at = now();
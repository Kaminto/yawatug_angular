-- Retroactively create 'paid' commissions for historical full payment share purchases
-- This will automatically trigger wallet transactions via the record_referral_commission_as_transaction trigger

INSERT INTO public.referral_commissions (
  referrer_id,
  referred_id,
  commission_amount,
  commission_rate,
  source_amount,
  earning_type,
  commission_type,
  is_from_installment,
  status,
  paid_at,
  currency,
  created_at
)
SELECT 
  p.referred_by as referrer_id,
  t.user_id as referred_id,
  ABS(t.amount) * 0.05 as commission_amount,
  0.05 as commission_rate,
  ABS(t.amount) as source_amount,
  'share_purchase' as earning_type,
  'direct_purchase' as commission_type,
  false as is_from_installment,
  'paid' as status,
  t.created_at as paid_at,
  COALESCE(t.currency, 'UGX') as currency,
  t.created_at as created_at
FROM transactions t
INNER JOIN profiles p ON t.user_id = p.id
WHERE p.referred_by IS NOT NULL
  AND t.transaction_type = 'share_purchase'
  AND t.status = 'completed'
  AND NOT EXISTS (
    -- Don't create if commission already exists for this transaction
    SELECT 1 FROM referral_commissions rc
    WHERE rc.referred_id = t.user_id
    AND rc.earning_type = 'share_purchase'
    AND ABS(rc.source_amount - ABS(t.amount)) < 1 -- Allow small rounding differences
    AND ABS(EXTRACT(EPOCH FROM (rc.created_at - t.created_at))) < 60 -- Within 1 minute of transaction
  );

-- Update referral statistics to include these retroactive commissions
WITH commission_totals AS (
  SELECT 
    referrer_id,
    SUM(commission_amount) as total_paid
  FROM referral_commissions
  WHERE status = 'paid'
  GROUP BY referrer_id
),
pending_totals AS (
  SELECT 
    referrer_id,
    SUM(commission_amount) as total_pending
  FROM referral_commissions
  WHERE status = 'pending'
  GROUP BY referrer_id
)
INSERT INTO referral_statistics (
  user_id,
  total_earnings,
  pending_earnings,
  updated_at,
  last_activity_at
)
SELECT 
  COALESCE(ct.referrer_id, pt.referrer_id) as user_id,
  COALESCE(ct.total_paid, 0) + COALESCE(pt.total_pending, 0) as total_earnings,
  COALESCE(pt.total_pending, 0) as pending_earnings,
  now() as updated_at,
  now() as last_activity_at
FROM commission_totals ct
FULL OUTER JOIN pending_totals pt ON ct.referrer_id = pt.referrer_id
ON CONFLICT (user_id) DO UPDATE SET
  total_earnings = EXCLUDED.total_earnings,
  pending_earnings = EXCLUDED.pending_earnings,
  updated_at = EXCLUDED.updated_at,
  last_activity_at = EXCLUDED.last_activity_at;
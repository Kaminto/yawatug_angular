-- Priority 1: Critical Security & Functionality Fixes for Referral System

-- 1. Add RLS Policy for credit_transactions table (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_transactions' 
    AND policyname = 'Users can view their own credit transactions'
  ) THEN
    CREATE POLICY "Users can view their own credit transactions"
    ON credit_transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_transactions' 
    AND policyname = 'System can insert credit transactions'
  ) THEN
    CREATE POLICY "System can insert credit transactions"
    ON credit_transactions FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- 2. Create function to award referral credits based on tier 2 settings
CREATE OR REPLACE FUNCTION award_credits_for_referrer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tier2_settings RECORD;
  referrer_profile RECORD;
  total_shares_referred NUMERIC;
  credits_to_award NUMERIC;
  existing_credits NUMERIC;
  eligibility_cutoff TIMESTAMP;
BEGIN
  -- Only process when status changes to 'paid'
  IF NEW.status != 'paid' OR OLD.status = 'paid' THEN
    RETURN NEW;
  END IF;

  -- Get tier 2 settings (credit rewards)
  SELECT * INTO tier2_settings
  FROM referral_tier_settings
  WHERE level = 2 AND is_active = true
  LIMIT 1;

  -- If no tier 2 settings or not active, skip
  IF tier2_settings IS NULL OR tier2_settings.shares_per_credit_trigger IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get referrer profile to check KYC completion
  SELECT * INTO referrer_profile
  FROM profiles
  WHERE id = NEW.referrer_id;

  -- Check KYC requirement
  IF tier2_settings.kyc_completion_required > 0 
     AND COALESCE(referrer_profile.profile_completion_percentage, 0) < tier2_settings.kyc_completion_required THEN
    RAISE NOTICE 'Referrer % does not meet KYC requirement of %', NEW.referrer_id, tier2_settings.kyc_completion_required;
    RETURN NEW;
  END IF;

  -- Calculate eligibility cutoff date
  eligibility_cutoff := CURRENT_TIMESTAMP - (tier2_settings.eligibility_days || ' days')::INTERVAL;

  -- Calculate total shares purchased by all referrals within eligibility window
  SELECT COALESCE(SUM(t.shares_quantity), 0) INTO total_shares_referred
  FROM transactions t
  INNER JOIN profiles p ON t.user_id = p.id
  WHERE p.referred_by = NEW.referrer_id
    AND t.transaction_type = 'share_purchase'
    AND t.status = 'completed'
    AND t.created_at >= eligibility_cutoff;

  -- Calculate how many credits should be awarded (1 credit per X shares)
  credits_to_award := FLOOR(total_shares_referred / tier2_settings.shares_per_credit_trigger);

  -- Get existing credits already awarded
  SELECT COALESCE(total_credits, 0) INTO existing_credits
  FROM referral_credits
  WHERE user_id = NEW.referrer_id;

  -- Award new credits if any are due
  IF credits_to_award > existing_credits THEN
    -- Insert or update referral_credits
    INSERT INTO referral_credits (
      user_id,
      total_credits,
      available_credits,
      created_at,
      updated_at
    ) VALUES (
      NEW.referrer_id,
      credits_to_award,
      credits_to_award,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id) DO UPDATE SET
      total_credits = credits_to_award,
      available_credits = referral_credits.available_credits + (credits_to_award - existing_credits),
      updated_at = CURRENT_TIMESTAMP;

    -- Log the credit transaction
    INSERT INTO credit_transactions (
      user_id,
      transaction_type,
      amount,
      balance_after,
      source_type,
      description,
      created_at
    ) VALUES (
      NEW.referrer_id,
      'earned',
      credits_to_award - existing_credits,
      credits_to_award,
      'referral_rewards',
      format('Earned %s credits for referring %s shares (Tier 2)', 
             credits_to_award - existing_credits, 
             total_shares_referred),
      CURRENT_TIMESTAMP
    );

    RAISE NOTICE 'Awarded % credits to referrer %', credits_to_award - existing_credits, NEW.referrer_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Create trigger on referral_commissions for automatic credit award
DROP TRIGGER IF EXISTS trigger_award_credits_on_commission ON referral_commissions;

CREATE TRIGGER trigger_award_credits_on_commission
AFTER UPDATE ON referral_commissions
FOR EACH ROW
WHEN (NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid'))
EXECUTE FUNCTION award_credits_for_referrer();

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer_status 
ON referral_commissions(referrer_id, status);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created 
ON credit_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by 
ON profiles(referred_by) WHERE referred_by IS NOT NULL;

-- 5. Create view for efficient rank calculation
CREATE OR REPLACE VIEW referrer_rankings AS
SELECT 
  referrer_id,
  SUM(commission_amount) as total_earnings,
  COUNT(*) as total_commissions,
  RANK() OVER (ORDER BY SUM(commission_amount) DESC) as rank,
  COUNT(DISTINCT referred_id) as unique_referrals
FROM referral_commissions
WHERE status = 'paid'
GROUP BY referrer_id;
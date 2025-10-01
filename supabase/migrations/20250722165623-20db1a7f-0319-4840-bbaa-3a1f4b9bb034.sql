-- Enhanced referral commission processing with proper admin fund integration

-- Drop existing function to recreate with better admin fund integration
DROP FUNCTION IF EXISTS public.process_referral_activity(uuid, uuid, text, uuid, numeric);

-- Create enhanced referral processing function with proper admin fund deduction
CREATE OR REPLACE FUNCTION public.process_referral_activity(
  p_referrer_id UUID,
  p_referred_id UUID,
  p_activity_type TEXT,
  p_transaction_id UUID DEFAULT NULL,
  p_investment_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referral_stats RECORD;
  commission_rate NUMERIC;
  commission_amount NUMERIC := 0;
  bonus_amount NUMERIC := 0;
  new_tier TEXT;
  activity_id UUID;
  admin_fund_id UUID;
  admin_fund_balance NUMERIC;
  referrer_wallet_id UUID;
  result JSONB;
  campaign_bonus NUMERIC := 1.0;
BEGIN
  -- Get or create referral statistics
  INSERT INTO referral_statistics (user_id)
  VALUES (p_referrer_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO referral_stats
  FROM referral_statistics
  WHERE user_id = p_referrer_id;
  
  -- Calculate commission based on current tier
  commission_rate := get_tier_commission_rate(referral_stats.tier);
  
  IF p_activity_type = 'first_investment' AND p_investment_amount > 0 THEN
    commission_amount := p_investment_amount * commission_rate;
    
    -- Check for active campaigns and apply bonuses
    SELECT COALESCE(MAX(bonus_multiplier), 1.0) INTO campaign_bonus
    FROM referral_campaigns
    WHERE is_active = true 
      AND start_date <= now() 
      AND end_date >= now();
      
    commission_amount := commission_amount * campaign_bonus;
    
    -- Get admin fund wallet for the transaction currency
    SELECT id, balance INTO admin_fund_id, admin_fund_balance
    FROM admin_sub_wallets 
    WHERE wallet_type = 'admin_fund' 
      AND currency = (SELECT currency FROM transactions WHERE id = p_transaction_id)
    LIMIT 1;
    
    -- Verify admin fund has sufficient balance
    IF admin_fund_id IS NULL THEN
      RAISE EXCEPTION 'Admin fund wallet not found for transaction currency';
    END IF;
    
    IF admin_fund_balance < commission_amount THEN
      RAISE EXCEPTION 'Insufficient admin fund balance for referral commission payment';
    END IF;
    
    -- Get referrer's wallet
    SELECT id INTO referrer_wallet_id
    FROM wallets 
    WHERE user_id = p_referrer_id 
      AND currency = (SELECT currency FROM transactions WHERE id = p_transaction_id)
    LIMIT 1;
    
    IF referrer_wallet_id IS NULL THEN
      RAISE EXCEPTION 'Referrer wallet not found';
    END IF;
    
    -- Deduct from admin fund
    UPDATE admin_sub_wallets 
    SET balance = balance - commission_amount,
        updated_at = now()
    WHERE id = admin_fund_id;
    
    -- Add to referrer's wallet
    UPDATE wallets 
    SET balance = balance + commission_amount,
        updated_at = now()
    WHERE id = referrer_wallet_id;
    
    -- Record the admin fund transfer
    INSERT INTO admin_wallet_fund_transfers (
      from_wallet_id,
      amount,
      currency,
      transfer_type,
      description,
      reference,
      created_by
    ) VALUES (
      admin_fund_id,
      commission_amount,
      (SELECT currency FROM transactions WHERE id = p_transaction_id),
      'referral_commission',
      'Referral commission payment for transaction: ' || p_transaction_id,
      'REF-' || p_transaction_id,
      p_referrer_id
    );
  END IF;
  
  -- Record the referral activity
  INSERT INTO referral_activities (
    referrer_id, 
    referred_id, 
    activity_type, 
    transaction_id,
    investment_amount, 
    commission_earned, 
    status,
    program_id
  ) VALUES (
    p_referrer_id, 
    p_referred_id, 
    p_activity_type, 
    p_transaction_id,
    p_investment_amount, 
    commission_amount, 
    'processed',
    (SELECT id FROM referral_programs WHERE is_active = true LIMIT 1)
  ) RETURNING id INTO activity_id;
  
  -- Update referral statistics
  IF p_activity_type = 'signup' THEN
    UPDATE referral_statistics 
    SET total_referrals = total_referrals + 1,
        updated_at = now(),
        last_activity_at = now()
    WHERE user_id = p_referrer_id;
  ELSIF p_activity_type = 'first_investment' THEN
    UPDATE referral_statistics 
    SET successful_referrals = successful_referrals + 1,
        total_earnings = total_earnings + commission_amount,
        updated_at = now(),
        last_activity_at = now()
    WHERE user_id = p_referrer_id;
    
    -- Check for tier upgrade
    SELECT successful_referrals INTO referral_stats.successful_referrals
    FROM referral_statistics WHERE user_id = p_referrer_id;
    
    new_tier := calculate_referral_tier(referral_stats.successful_referrals);
    
    IF new_tier != referral_stats.tier THEN
      UPDATE referral_statistics 
      SET tier = new_tier,
          achievements = achievements || jsonb_build_object(
            'type', 'tier_upgrade',
            'from_tier', referral_stats.tier,
            'to_tier', new_tier,
            'achieved_at', now()
          )
      WHERE user_id = p_referrer_id;
      
      -- Record tier upgrade activity
      INSERT INTO referral_activities (
        referrer_id, activity_type, status
      ) VALUES (
        p_referrer_id, 'tier_upgrade', 'processed'
      );
    END IF;
  END IF;
  
  result := jsonb_build_object(
    'success', true,
    'activity_id', activity_id,
    'commission_earned', commission_amount,
    'campaign_bonus_applied', campaign_bonus,
    'new_tier', COALESCE(new_tier, referral_stats.tier),
    'total_earnings', (SELECT total_earnings FROM referral_statistics WHERE user_id = p_referrer_id),
    'admin_fund_debited', commission_amount
  );
  
  RETURN result;
END;
$$;

-- Create function to process signup referrals (when someone registers with a referral code)
CREATE OR REPLACE FUNCTION public.process_signup_referral(
  p_referred_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_id UUID;
  result JSONB;
BEGIN
  -- Find the referrer by their referral code
  SELECT id INTO referrer_id
  FROM profiles
  WHERE referral_code = p_referral_code
    AND id != p_referred_user_id; -- Prevent self-referral
  
  IF referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid referral code'
    );
  END IF;
  
  -- Update the referred user's profile with referrer info
  UPDATE profiles 
  SET referred_by = referrer_id,
      updated_at = now()
  WHERE id = p_referred_user_id;
  
  -- Process the signup referral activity
  result := process_referral_activity(
    referrer_id,
    p_referred_user_id,
    'signup',
    NULL,
    0
  );
  
  RETURN result;
END;
$$;

-- Enhanced trigger function for automatic referral processing
CREATE OR REPLACE FUNCTION public.auto_process_referrals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_id UUID;
  referral_result JSONB;
BEGIN
  -- Only process completed share purchase transactions
  IF NEW.status = 'completed' 
     AND NEW.transaction_type = 'share_purchase' 
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Check if user was referred and this is their first investment
    SELECT referred_by INTO referrer_id
    FROM profiles
    WHERE id = NEW.user_id AND referred_by IS NOT NULL;
    
    IF referrer_id IS NOT NULL THEN
      -- Check if this is the user's first completed share purchase
      IF NOT EXISTS (
        SELECT 1 FROM transactions 
        WHERE user_id = NEW.user_id 
          AND transaction_type = 'share_purchase' 
          AND status = 'completed' 
          AND id != NEW.id
      ) THEN
        -- Process first investment referral reward
        SELECT process_referral_activity(
          referrer_id,
          NEW.user_id,
          'first_investment',
          NEW.id,
          ABS(NEW.amount)
        ) INTO referral_result;
        
        -- Log the referral processing result
        RAISE NOTICE 'Referral processed: %', referral_result;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS auto_process_referrals_trigger ON transactions;
CREATE TRIGGER auto_process_referrals_trigger
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_process_referrals();

-- Create function to get referral commission summary for admin dashboard
CREATE OR REPLACE FUNCTION public.get_referral_commission_summary(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_commissions_paid NUMERIC,
  total_transactions INTEGER,
  avg_commission_rate NUMERIC,
  admin_fund_impact NUMERIC,
  top_referrers JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH commission_stats AS (
    SELECT 
      SUM(ra.commission_earned) as total_paid,
      COUNT(*) as transaction_count,
      AVG(ra.commission_earned / NULLIF(ra.investment_amount, 0)) as avg_rate
    FROM referral_activities ra
    WHERE ra.activity_type = 'first_investment'
      AND ra.created_at::date BETWEEN p_start_date AND p_end_date
      AND ra.status = 'processed'
  ),
  top_referrers_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'user_id', rs.user_id,
        'total_earnings', rs.total_earnings,
        'successful_referrals', rs.successful_referrals,
        'tier', rs.tier
      ) ORDER BY rs.total_earnings DESC
    ) as top_referrers
    FROM referral_statistics rs
    WHERE rs.last_activity_at::date BETWEEN p_start_date AND p_end_date
    LIMIT 10
  )
  SELECT 
    COALESCE(cs.total_paid, 0),
    COALESCE(cs.transaction_count, 0),
    COALESCE(cs.avg_rate, 0),
    COALESCE(cs.total_paid, 0), -- This represents the impact on admin fund
    COALESCE(tr.top_referrers, '[]'::jsonb)
  FROM commission_stats cs
  CROSS JOIN top_referrers_data tr;
END;
$$;

-- Enhanced Referral System Schema

-- Create referral programs/campaigns table
CREATE TABLE IF NOT EXISTS referral_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  commission_rate NUMERIC NOT NULL DEFAULT 0.05,
  bonus_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'UGX',
  min_investment_threshold NUMERIC DEFAULT 0,
  max_earnings_per_user NUMERIC,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create enhanced referral activities tracking table
CREATE TABLE IF NOT EXISTS referral_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  program_id UUID REFERENCES referral_programs(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('signup', 'first_investment', 'milestone', 'tier_upgrade')),
  transaction_id UUID,
  investment_amount NUMERIC DEFAULT 0,
  commission_earned NUMERIC DEFAULT 0,
  bonus_earned NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid', 'cancelled')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create referral statistics and leaderboard table
CREATE TABLE IF NOT EXISTS referral_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  pending_earnings NUMERIC DEFAULT 0,
  lifetime_value NUMERIC DEFAULT 0,
  current_rank INTEGER,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  tier_progress NUMERIC DEFAULT 0,
  next_tier_threshold INTEGER DEFAULT 10,
  achievements JSONB DEFAULT '[]',
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create referral milestones table
CREATE TABLE IF NOT EXISTS referral_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  threshold_value INTEGER NOT NULL,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('referral_count', 'earnings_amount', 'investment_volume')),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('bonus_cash', 'commission_boost', 'badge', 'tier_upgrade')),
  reward_value NUMERIC DEFAULT 0,
  badge_icon TEXT,
  badge_color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create referral campaigns table for time-limited promotions
CREATE TABLE IF NOT EXISTS referral_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT DEFAULT 'bonus' CHECK (campaign_type IN ('bonus', 'competition', 'seasonal')),
  bonus_multiplier NUMERIC DEFAULT 1.0,
  fixed_bonus_amount NUMERIC DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  total_budget NUMERIC,
  spent_budget NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_programs
CREATE POLICY "Anyone can view active referral programs"
  ON referral_programs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage referral programs"
  ON referral_programs FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for referral_activities
CREATE POLICY "Users can view their own referral activities"
  ON referral_activities FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "System can insert referral activities"
  ON referral_activities FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all referral activities"
  ON referral_activities FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for referral_statistics
CREATE POLICY "Users can view their own referral statistics"
  ON referral_statistics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own referral statistics"
  ON referral_statistics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage referral statistics"
  ON referral_statistics FOR ALL
  USING (true);

-- RLS Policies for referral_milestones
CREATE POLICY "Anyone can view referral milestones"
  ON referral_milestones FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage referral milestones"
  ON referral_milestones FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for referral_campaigns
CREATE POLICY "Anyone can view active referral campaigns"
  ON referral_campaigns FOR SELECT
  USING (is_active = true AND start_date <= now() AND end_date >= now());

CREATE POLICY "Admins can manage referral campaigns"
  ON referral_campaigns FOR ALL
  USING (is_admin(auth.uid()));

-- Insert default referral program
INSERT INTO referral_programs (name, description, commission_rate, currency, is_active)
VALUES ('Standard Referral Program', 'Default referral program with 5% commission', 0.05, 'UGX', true)
ON CONFLICT DO NOTHING;

-- Insert tier milestones
INSERT INTO referral_milestones (name, description, threshold_value, milestone_type, reward_type, reward_value, badge_icon, badge_color) VALUES
('Bronze Achiever', 'First 5 successful referrals', 5, 'referral_count', 'badge', 0, '🥉', '#CD7F32'),
('Silver Recruiter', 'Reach 15 successful referrals', 15, 'referral_count', 'commission_boost', 0.01, '🥈', '#C0C0C0'),
('Gold Ambassador', 'Reach 30 successful referrals', 30, 'referral_count', 'commission_boost', 0.015, '🥇', '#FFD700'),
('Platinum Elite', 'Reach 50+ successful referrals', 50, 'referral_count', 'commission_boost', 0.02, '💎', '#E5E4E2')
ON CONFLICT DO NOTHING;

-- Create function to calculate referral tier
CREATE OR REPLACE FUNCTION calculate_referral_tier(referral_count INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF referral_count >= 50 THEN RETURN 'platinum';
  ELSIF referral_count >= 30 THEN RETURN 'gold';
  ELSIF referral_count >= 15 THEN RETURN 'silver';
  ELSE RETURN 'bronze';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to get tier commission rate
CREATE OR REPLACE FUNCTION get_tier_commission_rate(tier TEXT)
RETURNS NUMERIC AS $$
BEGIN
  CASE tier
    WHEN 'platinum' THEN RETURN 0.06;
    WHEN 'gold' THEN RETURN 0.055;
    WHEN 'silver' THEN RETURN 0.05;
    ELSE RETURN 0.04;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive referral processing function
CREATE OR REPLACE FUNCTION process_referral_activity(
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
  result JSONB;
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
    SELECT COALESCE(MAX(bonus_multiplier), 1.0) * commission_amount INTO commission_amount
    FROM referral_campaigns
    WHERE is_active = true 
      AND start_date <= now() 
      AND end_date >= now();
  END IF;
  
  -- Record the activity
  INSERT INTO referral_activities (
    referrer_id, referred_id, activity_type, transaction_id,
    investment_amount, commission_earned, status
  ) VALUES (
    p_referrer_id, p_referred_id, p_activity_type, p_transaction_id,
    p_investment_amount, commission_amount, 'processed'
  ) RETURNING id INTO activity_id;
  
  -- Update statistics
  IF p_activity_type = 'signup' THEN
    UPDATE referral_statistics 
    SET total_referrals = total_referrals + 1,
        updated_at = now()
    WHERE user_id = p_referrer_id;
  ELSIF p_activity_type = 'first_investment' THEN
    UPDATE referral_statistics 
    SET successful_referrals = successful_referrals + 1,
        total_earnings = total_earnings + commission_amount,
        pending_earnings = pending_earnings + commission_amount,
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
  
  -- Allocate commission to user wallet if investment activity
  IF p_activity_type = 'first_investment' AND commission_amount > 0 THEN
    UPDATE wallets 
    SET balance = balance + commission_amount,
        updated_at = now()
    WHERE user_id = p_referrer_id AND currency = 'UGX';
  END IF;
  
  result := jsonb_build_object(
    'success', true,
    'activity_id', activity_id,
    'commission_earned', commission_amount,
    'new_tier', COALESCE(new_tier, referral_stats.tier),
    'total_earnings', (SELECT total_earnings FROM referral_statistics WHERE user_id = p_referrer_id)
  );
  
  RETURN result;
END;
$$;

-- Create trigger to auto-process referrals on share purchases
CREATE OR REPLACE FUNCTION auto_process_referrals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_id UUID;
BEGIN
  -- Only process completed share purchase transactions
  IF NEW.status = 'completed' 
     AND NEW.transaction_type = 'share_purchase' 
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Check if user was referred
    SELECT referred_by INTO referrer_id
    FROM profiles
    WHERE id = NEW.user_id AND referred_by IS NOT NULL;
    
    IF referrer_id IS NOT NULL THEN
      -- Process referral reward
      PERFORM process_referral_activity(
        referrer_id,
        NEW.user_id,
        'first_investment',
        NEW.id,
        ABS(NEW.amount)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-processing referrals
CREATE TRIGGER auto_process_referrals_trigger
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_process_referrals();

-- Add updated_at triggers for all new tables
CREATE TRIGGER update_referral_programs_updated_at
  BEFORE UPDATE ON referral_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_activities_updated_at
  BEFORE UPDATE ON referral_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_statistics_updated_at
  BEFORE UPDATE ON referral_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

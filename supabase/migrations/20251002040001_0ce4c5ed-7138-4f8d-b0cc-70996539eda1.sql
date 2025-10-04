-- Phase 1: Database Schema Extensions for Enhanced Referral System

-- ============================================
-- 1. CREDITS SYSTEM TABLES
-- ============================================

-- Referral credits balance tracking
CREATE TABLE IF NOT EXISTS referral_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    total_credits NUMERIC NOT NULL DEFAULT 0,
    available_credits NUMERIC NOT NULL DEFAULT 0,
    staked_credits NUMERIC NOT NULL DEFAULT 0,
    converted_credits NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Credit transaction history
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'converted', 'staked', 'unstaked', 'prize_won')),
    amount NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    source_type TEXT, -- 'network_purchase', 'draw_prize', etc.
    source_id UUID,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin configurable credit conversion settings
CREATE TABLE IF NOT EXISTS credit_conversion_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shares_per_credit INTEGER NOT NULL DEFAULT 1,
    minimum_conversion_amount INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES profiles(id)
);

-- ============================================
-- 2. GRAND DRAW SYSTEM TABLES
-- ============================================

-- Draw events
CREATE TABLE IF NOT EXISTS grand_draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_name TEXT NOT NULL,
    draw_type TEXT NOT NULL DEFAULT 'weekly' CHECK (draw_type IN ('daily', 'weekly', 'monthly', 'special')),
    draw_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'drawn', 'completed', 'cancelled')),
    total_staked_credits NUMERIC NOT NULL DEFAULT 0,
    total_entries INTEGER NOT NULL DEFAULT 0,
    first_prize_percentage NUMERIC NOT NULL DEFAULT 50,
    second_prize_percentage NUMERIC NOT NULL DEFAULT 30,
    third_prize_percentage NUMERIC NOT NULL DEFAULT 20,
    first_winner_id UUID REFERENCES profiles(id),
    second_winner_id UUID REFERENCES profiles(id),
    third_winner_id UUID REFERENCES profiles(id),
    first_prize_shares INTEGER,
    second_prize_shares INTEGER,
    third_prize_shares INTEGER,
    drawn_at TIMESTAMP WITH TIME ZONE,
    drawn_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Draw entries (user stakes)
CREATE TABLE IF NOT EXISTS draw_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES grand_draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    credits_staked NUMERIC NOT NULL,
    entry_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(draw_id, user_id)
);

-- Draw winners archive
CREATE TABLE IF NOT EXISTS draw_winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES grand_draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position IN (1, 2, 3)),
    prize_shares INTEGER NOT NULL,
    prize_percentage NUMERIC NOT NULL,
    credits_staked NUMERIC NOT NULL,
    claimed BOOLEAN NOT NULL DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Draw settings
CREATE TABLE IF NOT EXISTS draw_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (draw_frequency IN ('daily', 'weekly', 'monthly')),
    minimum_stake INTEGER NOT NULL DEFAULT 1,
    maximum_stake INTEGER,
    auto_trigger_enabled BOOLEAN NOT NULL DEFAULT true,
    first_prize_percentage NUMERIC NOT NULL DEFAULT 50,
    second_prize_percentage NUMERIC NOT NULL DEFAULT 30,
    third_prize_percentage NUMERIC NOT NULL DEFAULT 20,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES profiles(id)
);

-- ============================================
-- 3. ENHANCED REFERRAL SETTINGS
-- ============================================

-- Extended referral configuration
CREATE TABLE IF NOT EXISTS referral_tier_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level INTEGER NOT NULL CHECK (level IN (1, 2)),
    level_name TEXT NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('cash_commission', 'credits')),
    commission_percentage NUMERIC, -- For Level 1
    shares_per_credit_trigger INTEGER, -- For Level 2 (e.g., every 10 shares = 1 credit)
    credits_per_trigger INTEGER, -- For Level 2
    kyc_completion_required NUMERIC NOT NULL DEFAULT 80,
    eligibility_days INTEGER, -- Time-limited qualification
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES profiles(id),
    UNIQUE(level)
);

-- Track referral qualification periods
CREATE TABLE IF NOT EXISTS referral_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    qualified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(referrer_id, referred_id)
);

-- ============================================
-- 4. ENABLE RLS
-- ============================================

ALTER TABLE referral_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_conversion_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE grand_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_tier_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_qualifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- Referral Credits Policies
CREATE POLICY "Users can view their own credits"
ON referral_credits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credits"
ON referral_credits FOR SELECT
USING (is_admin(auth.uid()));

-- Credit Transactions Policies
CREATE POLICY "Users can view their own credit transactions"
ON credit_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit transactions"
ON credit_transactions FOR SELECT
USING (is_admin(auth.uid()));

-- Credit Conversion Settings Policies
CREATE POLICY "Anyone can view active conversion settings"
ON credit_conversion_settings FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage conversion settings"
ON credit_conversion_settings FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Grand Draws Policies
CREATE POLICY "Users can view open and completed draws"
ON grand_draws FOR SELECT
USING (status IN ('open', 'drawn', 'completed'));

CREATE POLICY "Admins can manage all draws"
ON grand_draws FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Draw Entries Policies
CREATE POLICY "Users can view their own entries"
ON draw_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create entries"
ON draw_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all entries"
ON draw_entries FOR SELECT
USING (is_admin(auth.uid()));

-- Draw Winners Policies (Public for transparency)
CREATE POLICY "Everyone can view draw winners"
ON draw_winners FOR SELECT
USING (true);

CREATE POLICY "Admins can manage draw winners"
ON draw_winners FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Draw Settings Policies
CREATE POLICY "Anyone can view active draw settings"
ON draw_settings FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage draw settings"
ON draw_settings FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Referral Tier Settings Policies
CREATE POLICY "Anyone can view active tier settings"
ON referral_tier_settings FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage tier settings"
ON referral_tier_settings FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Referral Qualifications Policies
CREATE POLICY "Users can view their referral qualifications"
ON referral_qualifications FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Admins can manage qualifications"
ON referral_qualifications FOR ALL
USING (is_admin(auth.uid()));

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to check KYC completion percentage
CREATE OR REPLACE FUNCTION check_kyc_completion(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    completion_percentage NUMERIC;
BEGIN
    SELECT profile_completion_percentage INTO completion_percentage
    FROM profiles
    WHERE id = p_user_id;
    
    RETURN COALESCE(completion_percentage, 0);
END;
$$;

-- Function to check if purchase is from pool (not reserve/bonus)
CREATE OR REPLACE FUNCTION is_pool_purchase(p_transaction_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_pool BOOLEAN;
BEGIN
    -- Check if transaction is a pool purchase
    -- Exclude admin-issued shares, bonuses, buybacks
    SELECT 
        CASE 
            WHEN t.transaction_type = 'share_purchase' 
            AND t.status = 'completed'
            AND COALESCE((t.metadata->>'is_bonus')::boolean, false) = false
            AND COALESCE((t.metadata->>'is_reserve')::boolean, false) = false
            THEN true
            ELSE false
        END INTO is_pool
    FROM transactions t
    WHERE t.id = p_transaction_id;
    
    RETURN COALESCE(is_pool, false);
END;
$$;

-- ============================================
-- 7. INSERT DEFAULT SETTINGS
-- ============================================

-- Default Level 1 (Direct Referrals - Cash Commission)
INSERT INTO referral_tier_settings (level, level_name, reward_type, commission_percentage, kyc_completion_required, eligibility_days, is_active)
VALUES (1, 'Direct Referral Commission', 'cash_commission', 5.0, 80, 90, true)
ON CONFLICT (level) DO NOTHING;

-- Default Level 2 (Network Rewards - Credits)
INSERT INTO referral_tier_settings (level, level_name, reward_type, shares_per_credit_trigger, credits_per_trigger, kyc_completion_required, eligibility_days, is_active)
VALUES (2, 'Network Credit Rewards', 'credits', 10, 1, 80, 90, true)
ON CONFLICT (level) DO NOTHING;

-- Default Credit Conversion Settings
INSERT INTO credit_conversion_settings (shares_per_credit, minimum_conversion_amount, is_active)
VALUES (1, 10, true)
ON CONFLICT DO NOTHING;

-- Default Draw Settings
INSERT INTO draw_settings (draw_frequency, minimum_stake, first_prize_percentage, second_prize_percentage, third_prize_percentage, is_active)
VALUES ('weekly', 1, 50, 30, 20, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_referral_credits_user_id ON referral_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_grand_draws_status ON grand_draws(status);
CREATE INDEX IF NOT EXISTS idx_grand_draws_date ON grand_draws(draw_date);
CREATE INDEX IF NOT EXISTS idx_draw_entries_draw_id ON draw_entries(draw_id);
CREATE INDEX IF NOT EXISTS idx_draw_entries_user_id ON draw_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_draw_winners_draw_id ON draw_winners(draw_id);
CREATE INDEX IF NOT EXISTS idx_referral_qualifications_referrer ON referral_qualifications(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_qualifications_referred ON referral_qualifications(referred_id);
-- Referral System Relationship Improvements Migration (Corrected)

-- 1. Drop duplicate referral_earnings table (it's empty and duplicates referral_commissions)
DROP TABLE IF EXISTS referral_earnings CASCADE;

-- 2. Remove tier-related columns from referral_statistics (tier system removed from UI)
ALTER TABLE referral_statistics 
DROP COLUMN IF EXISTS tier,
DROP COLUMN IF EXISTS tier_progress,
DROP COLUMN IF EXISTS next_tier_threshold;

-- 3. Add proper foreign key constraints for data integrity
ALTER TABLE referral_commissions 
ADD CONSTRAINT fk_referral_commissions_referrer 
FOREIGN KEY (referrer_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE referral_commissions 
ADD CONSTRAINT fk_referral_commissions_referred 
FOREIGN KEY (referred_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE referral_activities 
ADD CONSTRAINT fk_referral_activities_referrer 
FOREIGN KEY (referrer_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE referral_activities 
ADD CONSTRAINT fk_referral_activities_referred 
FOREIGN KEY (referred_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE referral_statistics 
ADD CONSTRAINT fk_referral_statistics_user 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. Add validation to referral_settings to prevent invalid configurations
ALTER TABLE referral_settings 
ADD CONSTRAINT check_commission_rate_valid 
CHECK (setting_value >= 0 AND setting_value <= 100);

-- 5. Create materialized view for referral user summary (performance optimization)
CREATE MATERIALIZED VIEW referral_user_summary AS
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    p.referral_code,
    COALESCE(rs.total_referrals, 0) as total_referrals,
    COALESCE(rs.successful_referrals, 0) as successful_referrals,
    COALESCE(rs.total_earnings, 0) as total_earnings,
    COALESCE(rs.pending_earnings, 0) as pending_earnings,
    COALESCE(commission_summary.total_commissions, 0) as total_commissions,
    COALESCE(commission_summary.paid_commissions, 0) as paid_commissions,
    p.created_at as user_joined_at
FROM profiles p
LEFT JOIN referral_statistics rs ON p.id = rs.user_id
LEFT JOIN (
    SELECT 
        referrer_id,
        COUNT(*) as total_commissions,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_commissions
    FROM referral_commissions 
    GROUP BY referrer_id
) commission_summary ON p.id = commission_summary.referrer_id
WHERE p.referral_code IS NOT NULL;

-- Create index for performance
CREATE INDEX idx_referral_user_summary_refresh ON referral_user_summary (user_id);

-- 6. Create audit trail for referral settings changes
CREATE TABLE referral_settings_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_id uuid REFERENCES referral_settings(id) ON DELETE CASCADE,
    changed_by uuid REFERENCES profiles(id),
    old_values jsonb NOT NULL,
    new_values jsonb NOT NULL,
    change_reason text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE referral_settings_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view referral settings audit" 
ON referral_settings_audit FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create referral settings audit" 
ON referral_settings_audit FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- 7. Create referral payouts table for better tracking
CREATE TABLE referral_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    commission_ids uuid[] NOT NULL, -- Array of commission IDs included in this payout
    total_amount numeric NOT NULL CHECK (total_amount > 0),
    currency text NOT NULL DEFAULT 'UGX',
    payout_method text NOT NULL CHECK (payout_method IN ('wallet_credit', 'bank_transfer', 'mobile_money')),
    payout_reference text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    processed_by uuid REFERENCES profiles(id),
    processed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on payouts table
ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payouts" 
ON referral_payouts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payouts" 
ON referral_payouts FOR ALL 
USING (is_admin(auth.uid()));

-- 8. Create trigger to update referral_statistics when commissions change
CREATE OR REPLACE FUNCTION update_referral_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update statistics for the referrer
    INSERT INTO referral_statistics (user_id, total_referrals, successful_referrals, total_earnings, pending_earnings)
    SELECT 
        NEW.referrer_id,
        COUNT(DISTINCT referred_id),
        COUNT(DISTINCT CASE WHEN status = 'paid' THEN referred_id END),
        COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0)
    FROM referral_commissions 
    WHERE referrer_id = NEW.referrer_id
    GROUP BY referrer_id
    ON CONFLICT (user_id) DO UPDATE SET
        total_referrals = EXCLUDED.total_referrals,
        successful_referrals = EXCLUDED.successful_referrals,
        total_earnings = EXCLUDED.total_earnings,
        pending_earnings = EXCLUDED.pending_earnings,
        updated_at = now();
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_referral_statistics ON referral_commissions;
CREATE TRIGGER trigger_update_referral_statistics
    AFTER INSERT OR UPDATE ON referral_commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_statistics();

-- 9. Create trigger to log referral settings changes
CREATE OR REPLACE FUNCTION log_referral_settings_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO referral_settings_audit (
            setting_id,
            changed_by,
            old_values,
            new_values,
            change_reason
        ) VALUES (
            NEW.id,
            auth.uid(),
            to_jsonb(OLD),
            to_jsonb(NEW),
            'Settings updated via admin interface'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for settings audit
DROP TRIGGER IF EXISTS trigger_log_referral_settings_changes ON referral_settings;
CREATE TRIGGER trigger_log_referral_settings_changes
    AFTER UPDATE ON referral_settings
    FOR EACH ROW
    EXECUTE FUNCTION log_referral_settings_changes();

-- 10. Function to refresh materialized view (for performance)
CREATE OR REPLACE FUNCTION refresh_referral_user_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW referral_user_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_referral_user_summary() TO authenticated;
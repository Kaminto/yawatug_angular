-- Fix security issues from referral system migration

-- 1. Fix function search paths for new functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION refresh_referral_user_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW referral_user_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Remove materialized view from API access (make it internal only)
REVOKE ALL ON referral_user_summary FROM authenticated;
REVOKE ALL ON referral_user_summary FROM anon;

-- 3. Create a secure function to access materialized view data instead
CREATE OR REPLACE FUNCTION get_referral_user_summary(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
    user_id uuid,
    full_name text,
    email text,
    referral_code text,
    total_referrals bigint,
    successful_referrals bigint,
    total_earnings numeric,
    pending_earnings numeric,
    total_commissions bigint,
    paid_commissions bigint,
    user_joined_at timestamp with time zone
) AS $$
BEGIN
    -- Admin can see all users, regular users only see their own data
    IF is_admin(auth.uid()) THEN
        RETURN QUERY
        SELECT * FROM referral_user_summary
        WHERE (p_user_id IS NULL OR referral_user_summary.user_id = p_user_id);
    ELSE
        RETURN QUERY
        SELECT * FROM referral_user_summary
        WHERE referral_user_summary.user_id = auth.uid();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_referral_user_summary(uuid) TO authenticated;
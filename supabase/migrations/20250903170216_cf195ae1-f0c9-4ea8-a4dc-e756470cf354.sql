-- Data Recovery Migration: Restore Lost Referral Earnings (Corrected Column Names)
-- This migration reconstructs missing referral commission data from transaction history

-- Create function to recover referral commissions from transaction history
CREATE OR REPLACE FUNCTION recover_referral_commissions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    recovery_stats jsonb := '{"total_recovered": 0, "users_affected": 0, "total_amount": 0}';
    transaction_record RECORD;
    commission_rate numeric := 0.05; -- 5% default commission rate
    commission_amount numeric;
    recovery_count integer := 0;
    total_amount numeric := 0;
    users_affected integer := 0;
BEGIN
    -- Get commission rate from referral settings if available
    SELECT setting_value INTO commission_rate
    FROM referral_settings 
    WHERE setting_name = 'commission_rate' 
    AND is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Use default if not found
    IF commission_rate IS NULL THEN
        commission_rate := 0.05; -- Default 5%
    END IF;

    -- Find all share purchase transactions that should have generated referral commissions
    FOR transaction_record IN
        SELECT DISTINCT
            t.id as transaction_id,
            t.user_id,
            t.amount,
            t.created_at as transaction_date,
            p.referred_by as referring_user_id
        FROM transactions t
        JOIN profiles p ON t.user_id = p.id
        WHERE t.transaction_type IN ('share_purchase', 'share_buy')
        AND t.status = 'completed'
        AND p.referred_by IS NOT NULL
        AND p.referred_by != t.user_id -- Prevent self-referral
        AND NOT EXISTS (
            -- Only process if commission doesn't already exist
            SELECT 1 FROM referral_commissions rc 
            WHERE rc.transaction_id = t.id
        )
        ORDER BY t.created_at ASC
    LOOP
        -- Calculate commission amount
        commission_amount := transaction_record.amount * commission_rate;
        
        -- Insert recovered commission record
        INSERT INTO referral_commissions (
            referrer_id,
            referred_user_id,
            transaction_id,
            commission_type,
            commission_amount,
            status,
            transaction_amount,
            commission_rate,
            created_at,
            paid_at,
            recovery_notes
        ) VALUES (
            transaction_record.referring_user_id,
            transaction_record.user_id,
            transaction_record.transaction_id,
            'direct_sale',
            commission_amount,
            'paid', -- Mark as paid since these are historical
            transaction_record.amount,
            commission_rate,
            transaction_record.transaction_date,
            transaction_record.transaction_date, -- Mark as paid immediately for historical data
            'Data recovery: Reconstructed from transaction history on ' || now()::date
        );
        
        recovery_count := recovery_count + 1;
        total_amount := total_amount + commission_amount;
    END LOOP;

    -- Update referral statistics with recovered data (using correct column names)
    WITH commission_totals AS (
        SELECT 
            rc.referrer_id,
            SUM(rc.commission_amount) as total_earnings_amount,
            COUNT(*) as total_referral_count
        FROM referral_commissions rc
        WHERE rc.status = 'paid'
        GROUP BY rc.referrer_id
    )
    UPDATE referral_statistics rs
    SET 
        total_earnings = COALESCE(ct.total_earnings_amount, 0),
        successful_referrals = COALESCE(ct.total_referral_count, 0),
        updated_at = now(),
        last_activity_at = now()
    FROM commission_totals ct
    WHERE rs.user_id = ct.referrer_id;

    -- Count unique users affected by recovery
    SELECT COUNT(DISTINCT rc.referrer_id) INTO users_affected
    FROM referral_commissions rc
    WHERE rc.recovery_notes LIKE '%Data recovery%';

    -- Build return statistics
    recovery_stats := jsonb_build_object(
        'total_recovered', recovery_count,
        'users_affected', users_affected,
        'total_amount', total_amount,
        'recovery_date', now(),
        'commission_rate_used', commission_rate
    );

    RETURN recovery_stats;
END;
$$;

-- Execute the recovery process
SELECT recover_referral_commissions() as recovery_results;

-- Create permanent audit table for future tracking
CREATE TABLE IF NOT EXISTS referral_data_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_type text NOT NULL,
    user_id uuid,
    old_values jsonb,
    new_values jsonb,
    operation_details jsonb,
    performed_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table  
ALTER TABLE referral_data_audit ENABLE ROW LEVEL SECURITY;

-- Add policy for admins to manage audit data
CREATE POLICY "Admins can manage referral audit data"
ON referral_data_audit
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Log the completion of data recovery
INSERT INTO referral_data_audit (
    audit_type,
    operation_details
) VALUES (
    'data_recovery_migration_completed',
    jsonb_build_object(
        'migration_date', now(),
        'description', 'Referral data recovery migration executed successfully',
        'tables_affected', ARRAY['referral_commissions', 'referral_statistics', 'referral_data_audit']
    )
);
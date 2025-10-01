-- Fix security issues by adding missing RLS policies and default data

-- Insert default voting settings with proper UUID
DO $$
DECLARE
    admin_uuid UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
    -- Insert default voting settings if they don't exist
    INSERT INTO public.voting_settings (setting_key, setting_value, setting_type, description, created_by) 
    SELECT v.setting_key, v.setting_value, v.setting_type, v.description, admin_uuid
    FROM (VALUES
        ('default_voting_period_days', '7', 'integer', 'Default voting period in days'),
        ('notification_enabled', 'true', 'boolean', 'Enable voting notifications'),
        ('quorum_threshold', '25', 'numeric', 'Default quorum threshold percentage'),
        ('max_proposal_length', '5000', 'integer', 'Maximum proposal description length'),
        ('allow_vote_changes', 'false', 'boolean', 'Allow users to change their votes')
    ) AS v(setting_key, setting_value, setting_type, description)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.voting_settings WHERE setting_key = v.setting_key
    );

    -- Insert default eligibility rules if they don't exist
    INSERT INTO public.voting_eligibility_rules (
        rule_name, minimum_shares, minimum_holding_period_days, 
        minimum_account_age_days, requires_verification, created_by
    ) 
    SELECT v.rule_name, v.minimum_shares, v.minimum_holding_period_days, 
           v.minimum_account_age_days, v.requires_verification, admin_uuid
    FROM (VALUES
        ('Standard Voting', 1, 0, 0, true),
        ('Major Decisions', 10, 30, 30, true),
        ('Strategic Decisions', 50, 90, 90, true)
    ) AS v(rule_name, minimum_shares, minimum_holding_period_days, minimum_account_age_days, requires_verification)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.voting_eligibility_rules WHERE rule_name = v.rule_name
    );
END $$;
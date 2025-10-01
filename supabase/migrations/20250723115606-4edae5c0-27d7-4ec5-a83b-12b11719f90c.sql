-- Enhanced Voting System - Production Ready Features
-- This enhances the existing voting system with additional security, validation, and features

-- Create enum types for better data consistency
DO $$ BEGIN
    CREATE TYPE public.proposal_status_enhanced AS ENUM ('draft', 'review', 'active', 'closed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.vote_choice AS ENUM ('yes', 'no', 'abstain');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to existing voting_proposals table
ALTER TABLE public.voting_proposals 
ADD COLUMN IF NOT EXISTS minimum_shares_required INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS quorum_percentage NUMERIC(5,2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS voting_method TEXT DEFAULT 'simple_majority',
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS proposal_document_url TEXT;

-- Add constraints to existing table
DO $$ BEGIN
    ALTER TABLE public.voting_proposals 
    ADD CONSTRAINT valid_dates_check CHECK (end_date > start_date);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.voting_proposals 
    ADD CONSTRAINT valid_quorum_check CHECK (quorum_percentage >= 0 AND quorum_percentage <= 100);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enhance user_votes table
ALTER TABLE public.user_votes 
ADD COLUMN IF NOT EXISTS vote_choice public.vote_choice,
ADD COLUMN IF NOT EXISTS voting_power NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS voted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS vote_hash TEXT,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add unique constraint to prevent double voting
DO $$ BEGIN
    ALTER TABLE public.user_votes 
    ADD CONSTRAINT unique_user_proposal_vote UNIQUE(proposal_id, user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create voting settings table
CREATE TABLE IF NOT EXISTS public.voting_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type TEXT NOT NULL DEFAULT 'string',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL
);

-- Create voting eligibility rules table
CREATE TABLE IF NOT EXISTS public.voting_eligibility_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name TEXT NOT NULL,
    proposal_type TEXT,
    minimum_shares INTEGER NOT NULL DEFAULT 1,
    minimum_holding_period_days INTEGER NOT NULL DEFAULT 0,
    minimum_account_age_days INTEGER NOT NULL DEFAULT 0,
    requires_verification BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL
);

-- Create voting audit log table
CREATE TABLE IF NOT EXISTS public.voting_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID REFERENCES public.voting_proposals(id) ON DELETE CASCADE,
    user_id UUID,
    action_type TEXT NOT NULL,
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voting notifications table
CREATE TABLE IF NOT EXISTS public.voting_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    proposal_id UUID NOT NULL REFERENCES public.voting_proposals(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security on all tables
ALTER TABLE public.voting_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_eligibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active proposals" ON public.voting_proposals;
DROP POLICY IF EXISTS "Admins can manage all proposals" ON public.voting_proposals;
DROP POLICY IF EXISTS "Users can view their own votes" ON public.user_votes;
DROP POLICY IF EXISTS "Users can insert their own votes" ON public.user_votes;
DROP POLICY IF EXISTS "Admins can view all votes" ON public.user_votes;

-- Create comprehensive RLS policies
CREATE POLICY "Anyone can view active proposals" ON public.voting_proposals
FOR SELECT USING (status IN ('active', 'closed'));

CREATE POLICY "Admins can manage all proposals" ON public.voting_proposals
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'
    )
);

-- User votes policies
CREATE POLICY "Users can view their own votes" ON public.user_votes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own votes" ON public.user_votes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all votes" ON public.user_votes
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'
    )
);

-- Voting options policies
CREATE POLICY "Anyone can view voting options" ON public.voting_options
FOR SELECT USING (true);

CREATE POLICY "Admins can manage voting options" ON public.voting_options
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'
    )
);

-- Other table policies
CREATE POLICY "Anyone can view voting settings" ON public.voting_settings
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage voting settings" ON public.voting_settings
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'
    )
);

CREATE POLICY "Anyone can view active eligibility rules" ON public.voting_eligibility_rules
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage eligibility rules" ON public.voting_eligibility_rules
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'
    )
);

CREATE POLICY "Admins can view audit log" ON public.voting_audit_log
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'
    )
);

CREATE POLICY "Users can view their own notifications" ON public.voting_notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.voting_notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Enhanced Database Functions

-- Function to get user's current voting power based on shares
CREATE OR REPLACE FUNCTION public.get_user_voting_power(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_shares INTEGER := 0;
BEGIN
    -- Get total shares from user_shares table
    SELECT COALESCE(SUM(quantity), 0) INTO total_shares
    FROM public.user_shares
    WHERE user_id = p_user_id;
    
    -- Return shares as voting power (1 share = 1 vote)
    RETURN total_shares::NUMERIC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is eligible to vote on a proposal
CREATE OR REPLACE FUNCTION public.check_voting_eligibility(p_user_id UUID, p_proposal_id UUID)
RETURNS JSONB AS $$
DECLARE
    proposal_record RECORD;
    user_shares INTEGER := 0;
    user_profile RECORD;
    eligibility_rule RECORD;
BEGIN
    -- Get proposal details
    SELECT * INTO proposal_record FROM public.voting_proposals WHERE id = p_proposal_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'Proposal not found');
    END IF;
    
    -- Check if proposal is active
    IF proposal_record.status != 'active' THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'Proposal is not active');
    END IF;
    
    -- Check if voting period is active
    IF now() < proposal_record.start_date OR now() > proposal_record.end_date THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'Voting period not active');
    END IF;
    
    -- Get user profile
    SELECT * INTO user_profile FROM public.profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'User profile not found');
    END IF;
    
    -- Check if user has enough shares
    user_shares := public.get_user_voting_power(p_user_id);
    
    IF user_shares < COALESCE(proposal_record.minimum_shares_required, 1) THEN
        RETURN jsonb_build_object(
            'eligible', false, 
            'reason', 'Insufficient shares',
            'required', COALESCE(proposal_record.minimum_shares_required, 1),
            'current', user_shares
        );
    END IF;
    
    -- Check if user already voted
    IF EXISTS (SELECT 1 FROM public.user_votes WHERE proposal_id = p_proposal_id AND user_id = p_user_id) THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'Already voted');
    END IF;
    
    -- Check if account is verified if required
    IF user_profile.status != 'active' THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'Account verification required');
    END IF;
    
    RETURN jsonb_build_object('eligible', true, 'voting_power', user_shares);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cast a vote with full validation
CREATE OR REPLACE FUNCTION public.cast_vote(
    p_user_id UUID,
    p_proposal_id UUID,
    p_option_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    eligibility_check JSONB;
    voting_power NUMERIC;
    vote_id UUID;
BEGIN
    -- Check eligibility
    eligibility_check := public.check_voting_eligibility(p_user_id, p_proposal_id);
    
    IF NOT (eligibility_check->>'eligible')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', eligibility_check->>'reason'
        );
    END IF;
    
    voting_power := (eligibility_check->>'voting_power')::NUMERIC;
    
    -- Insert vote
    INSERT INTO public.user_votes (
        proposal_id, option_id, user_id, shares_weight, 
        voting_power, ip_address, user_agent
    ) VALUES (
        p_proposal_id, p_option_id, p_user_id, voting_power::INTEGER,
        voting_power, p_ip_address, p_user_agent
    ) RETURNING id INTO vote_id;
    
    -- Update voting option counts
    UPDATE public.voting_options 
    SET votes_count = votes_count + 1,
        shares_voted = shares_voted + voting_power::INTEGER
    WHERE id = p_option_id;
    
    -- Update proposal total counts
    UPDATE public.voting_proposals 
    SET total_votes = total_votes + 1,
        total_shares_voted = total_shares_voted + voting_power::INTEGER,
        updated_at = now()
    WHERE id = p_proposal_id;
    
    -- Log the vote action
    INSERT INTO public.voting_audit_log (
        proposal_id, user_id, action_type, action_details, ip_address, user_agent
    ) VALUES (
        p_proposal_id, p_user_id, 'vote_cast',
        jsonb_build_object('option_id', p_option_id, 'voting_power', voting_power),
        p_ip_address, p_user_agent
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'vote_id', vote_id,
        'voting_power', voting_power
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-close expired proposals
CREATE OR REPLACE FUNCTION public.auto_close_expired_proposals()
RETURNS INTEGER AS $$
DECLARE
    closed_count INTEGER := 0;
BEGIN
    UPDATE public.voting_proposals 
    SET status = 'closed', updated_at = now()
    WHERE status = 'active' 
    AND end_date <= now();
    
    GET DIAGNOSTICS closed_count = ROW_COUNT;
    
    -- Log auto-closure
    INSERT INTO public.voting_audit_log (action_type, action_details)
    VALUES ('auto_close_proposals', jsonb_build_object('closed_count', closed_count));
    
    RETURN closed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if proposal meets quorum
CREATE OR REPLACE FUNCTION public.check_proposal_quorum(p_proposal_id UUID)
RETURNS JSONB AS $$
DECLARE
    proposal_record RECORD;
    total_eligible_shares INTEGER := 0;
    participation_percentage NUMERIC;
BEGIN
    -- Get proposal details
    SELECT * INTO proposal_record FROM public.voting_proposals WHERE id = p_proposal_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Proposal not found');
    END IF;
    
    -- Get total eligible shares (simplified - could be more complex)
    SELECT COALESCE(SUM(quantity), 0) INTO total_eligible_shares
    FROM public.user_shares;
    
    -- Calculate participation percentage
    IF total_eligible_shares > 0 THEN
        participation_percentage := (proposal_record.total_shares_voted::NUMERIC / total_eligible_shares::NUMERIC) * 100;
    ELSE
        participation_percentage := 0;
    END IF;
    
    RETURN jsonb_build_object(
        'quorum_met', participation_percentage >= COALESCE(proposal_record.quorum_percentage, 25),
        'participation_percentage', participation_percentage,
        'required_percentage', COALESCE(proposal_record.quorum_percentage, 25),
        'total_votes', proposal_record.total_votes,
        'total_shares_voted', proposal_record.total_shares_voted,
        'total_eligible_shares', total_eligible_shares
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default voting settings if they don't exist
INSERT INTO public.voting_settings (setting_key, setting_value, setting_type, description, created_by) 
SELECT * FROM (VALUES
    ('default_voting_period_days', '7', 'integer', 'Default voting period in days', '00000000-0000-0000-0000-000000000000'),
    ('notification_enabled', 'true', 'boolean', 'Enable voting notifications', '00000000-0000-0000-0000-000000000000'),
    ('quorum_threshold', '25', 'numeric', 'Default quorum threshold percentage', '00000000-0000-0000-0000-000000000000'),
    ('max_proposal_length', '5000', 'integer', 'Maximum proposal description length', '00000000-0000-0000-0000-000000000000'),
    ('allow_vote_changes', 'false', 'boolean', 'Allow users to change their votes', '00000000-0000-0000-0000-000000000000')
) AS v(setting_key, setting_value, setting_type, description, created_by)
WHERE NOT EXISTS (
    SELECT 1 FROM public.voting_settings WHERE setting_key = v.setting_key
);

-- Insert default eligibility rules if they don't exist
INSERT INTO public.voting_eligibility_rules (
    rule_name, minimum_shares, minimum_holding_period_days, 
    minimum_account_age_days, requires_verification, created_by
) 
SELECT * FROM (VALUES
    ('Standard Voting', 1, 0, 0, true, '00000000-0000-0000-0000-000000000000'),
    ('Major Decisions', 10, 30, 30, true, '00000000-0000-0000-0000-000000000000'),
    ('Strategic Decisions', 50, 90, 90, true, '00000000-0000-0000-0000-000000000000')
) AS v(rule_name, minimum_shares, minimum_holding_period_days, minimum_account_age_days, requires_verification, created_by)
WHERE NOT EXISTS (
    SELECT 1 FROM public.voting_eligibility_rules WHERE rule_name = v.rule_name
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_voting_proposals_status ON public.voting_proposals(status);
CREATE INDEX IF NOT EXISTS idx_voting_proposals_dates ON public.voting_proposals(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_user_votes_proposal ON public.user_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_user ON public.user_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_voting_audit_proposal ON public.voting_audit_log(proposal_id);
CREATE INDEX IF NOT EXISTS idx_voting_notifications_user ON public.voting_notifications(user_id, is_read);

-- Enable realtime for real-time voting updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.voting_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voting_options;
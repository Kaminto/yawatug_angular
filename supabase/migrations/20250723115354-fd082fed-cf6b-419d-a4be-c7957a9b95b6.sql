-- Comprehensive Voting System Database Schema
-- This creates a production-ready voting system with proper validation, security, and audit trails

-- Enum types for voting system
CREATE TYPE public.proposal_status AS ENUM ('draft', 'review', 'active', 'closed', 'cancelled');
CREATE TYPE public.proposal_type AS ENUM ('expansion', 'dividend', 'governance', 'financial', 'operational', 'strategic');
CREATE TYPE public.vote_choice AS ENUM ('yes', 'no', 'abstain');
CREATE TYPE public.voting_method AS ENUM ('simple_majority', 'supermajority_60', 'supermajority_75', 'unanimous');

-- 1. Voting Proposals Table
CREATE TABLE public.voting_proposals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    proposal_type public.proposal_type NOT NULL,
    status public.proposal_status NOT NULL DEFAULT 'draft',
    voting_method public.voting_method NOT NULL DEFAULT 'simple_majority',
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    
    -- Eligibility & Requirements
    minimum_shares_required INTEGER NOT NULL DEFAULT 1,
    quorum_percentage NUMERIC(5,2) NOT NULL DEFAULT 25.00,
    
    -- Vote counts (updated via triggers)
    total_votes_cast INTEGER NOT NULL DEFAULT 0,
    yes_votes INTEGER NOT NULL DEFAULT 0,
    no_votes INTEGER NOT NULL DEFAULT 0,
    abstain_votes INTEGER NOT NULL DEFAULT 0,
    total_voting_power NUMERIC(15,2) NOT NULL DEFAULT 0,
    yes_voting_power NUMERIC(15,2) NOT NULL DEFAULT 0,
    no_voting_power NUMERIC(15,2) NOT NULL DEFAULT 0,
    abstain_voting_power NUMERIC(15,2) NOT NULL DEFAULT 0,
    
    -- Metadata
    created_by UUID NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    proposal_document_url TEXT,
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (end_date > start_date),
    CONSTRAINT valid_quorum CHECK (quorum_percentage >= 0 AND quorum_percentage <= 100),
    CONSTRAINT valid_shares CHECK (minimum_shares_required > 0)
);

-- 2. User Votes Table
CREATE TABLE public.user_votes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES public.voting_proposals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    vote_choice public.vote_choice NOT NULL,
    voting_power NUMERIC(15,2) NOT NULL DEFAULT 0,
    shares_at_vote_time INTEGER NOT NULL DEFAULT 0,
    
    -- Timing
    voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    vote_hash TEXT, -- For vote verification/audit
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    
    -- Constraints
    UNIQUE(proposal_id, user_id),
    CONSTRAINT valid_voting_power CHECK (voting_power >= 0),
    CONSTRAINT valid_shares_at_vote CHECK (shares_at_vote_time >= 0)
);

-- 3. Voting Settings Table
CREATE TABLE public.voting_settings (
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

-- 4. Voting Eligibility Rules Table
CREATE TABLE public.voting_eligibility_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name TEXT NOT NULL,
    proposal_type public.proposal_type,
    minimum_shares INTEGER NOT NULL DEFAULT 1,
    minimum_holding_period_days INTEGER NOT NULL DEFAULT 0,
    minimum_account_age_days INTEGER NOT NULL DEFAULT 0,
    requires_verification BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL
);

-- 5. Voting Audit Log Table
CREATE TABLE public.voting_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID REFERENCES public.voting_proposals(id) ON DELETE CASCADE,
    user_id UUID,
    action_type TEXT NOT NULL,
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Voting Notifications Table
CREATE TABLE public.voting_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    proposal_id UUID NOT NULL REFERENCES public.voting_proposals(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.voting_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_eligibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voting_proposals
CREATE POLICY "Anyone can view active proposals" ON public.voting_proposals
FOR SELECT USING (status IN ('active', 'closed'));

CREATE POLICY "Admins can manage all proposals" ON public.voting_proposals
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'
    )
);

-- RLS Policies for user_votes
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

-- RLS Policies for voting_settings
CREATE POLICY "Anyone can view voting settings" ON public.voting_settings
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage voting settings" ON public.voting_settings
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'
    )
);

-- RLS Policies for voting_eligibility_rules
CREATE POLICY "Anyone can view active eligibility rules" ON public.voting_eligibility_rules
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage eligibility rules" ON public.voting_eligibility_rules
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'
    )
);

-- RLS Policies for voting_audit_log
CREATE POLICY "Admins can view audit log" ON public.voting_audit_log
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'
    )
);

-- RLS Policies for voting_notifications
CREATE POLICY "Users can view their own notifications" ON public.voting_notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.voting_notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Database Functions for Voting Logic

-- Function to get user's current voting power
CREATE OR REPLACE FUNCTION public.get_user_voting_power(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_shares INTEGER := 0;
BEGIN
    -- Get total shares from user_shares table (if it exists)
    SELECT COALESCE(SUM(quantity), 0) INTO total_shares
    FROM public.user_shares
    WHERE user_id = p_user_id;
    
    -- Return shares as voting power (1 share = 1 vote for now)
    RETURN total_shares::NUMERIC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is eligible to vote
CREATE OR REPLACE FUNCTION public.check_voting_eligibility(p_user_id UUID, p_proposal_id UUID)
RETURNS JSONB AS $$
DECLARE
    proposal_record RECORD;
    user_shares INTEGER := 0;
    user_profile RECORD;
    eligibility_rule RECORD;
    result JSONB;
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
    
    IF user_shares < proposal_record.minimum_shares_required THEN
        RETURN jsonb_build_object(
            'eligible', false, 
            'reason', 'Insufficient shares',
            'required', proposal_record.minimum_shares_required,
            'current', user_shares
        );
    END IF;
    
    -- Check if user already voted
    IF EXISTS (SELECT 1 FROM public.user_votes WHERE proposal_id = p_proposal_id AND user_id = p_user_id) THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'Already voted');
    END IF;
    
    -- Check additional eligibility rules
    SELECT * INTO eligibility_rule 
    FROM public.voting_eligibility_rules 
    WHERE (proposal_type IS NULL OR proposal_type = proposal_record.proposal_type) 
    AND is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF FOUND THEN
        -- Check verification requirement
        IF eligibility_rule.requires_verification AND user_profile.status != 'active' THEN
            RETURN jsonb_build_object('eligible', false, 'reason', 'Account verification required');
        END IF;
        
        -- Check account age
        IF eligibility_rule.minimum_account_age_days > 0 THEN
            IF user_profile.created_at > (now() - (eligibility_rule.minimum_account_age_days || ' days')::INTERVAL) THEN
                RETURN jsonb_build_object('eligible', false, 'reason', 'Account too new');
            END IF;
        END IF;
    END IF;
    
    RETURN jsonb_build_object('eligible', true, 'voting_power', user_shares);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cast a vote
CREATE OR REPLACE FUNCTION public.cast_vote(
    p_user_id UUID,
    p_proposal_id UUID,
    p_vote_choice public.vote_choice,
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
        proposal_id, user_id, vote_choice, voting_power, 
        shares_at_vote_time, ip_address, user_agent
    ) VALUES (
        p_proposal_id, p_user_id, p_vote_choice, voting_power,
        voting_power::INTEGER, p_ip_address, p_user_agent
    ) RETURNING id INTO vote_id;
    
    -- Log the vote action
    INSERT INTO public.voting_audit_log (
        proposal_id, user_id, action_type, action_details, ip_address, user_agent
    ) VALUES (
        p_proposal_id, p_user_id, 'vote_cast',
        jsonb_build_object('vote_choice', p_vote_choice, 'voting_power', voting_power),
        p_ip_address, p_user_agent
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'vote_id', vote_id,
        'voting_power', voting_power
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update vote counts on proposals
CREATE OR REPLACE FUNCTION public.update_proposal_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update vote counts for the proposal
        UPDATE public.voting_proposals SET
            total_votes_cast = total_votes_cast + 1,
            yes_votes = CASE WHEN NEW.vote_choice = 'yes' THEN yes_votes + 1 ELSE yes_votes END,
            no_votes = CASE WHEN NEW.vote_choice = 'no' THEN no_votes + 1 ELSE no_votes END,
            abstain_votes = CASE WHEN NEW.vote_choice = 'abstain' THEN abstain_votes + 1 ELSE abstain_votes END,
            total_voting_power = total_voting_power + NEW.voting_power,
            yes_voting_power = CASE WHEN NEW.vote_choice = 'yes' THEN yes_voting_power + NEW.voting_power ELSE yes_voting_power END,
            no_voting_power = CASE WHEN NEW.vote_choice = 'no' THEN no_voting_power + NEW.voting_power ELSE no_voting_power END,
            abstain_voting_power = CASE WHEN NEW.vote_choice = 'abstain' THEN abstain_voting_power + NEW.voting_power ELSE abstain_voting_power END,
            updated_at = now()
        WHERE id = NEW.proposal_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update vote counts
CREATE TRIGGER update_vote_counts_trigger
    AFTER INSERT ON public.user_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_proposal_vote_counts();

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

-- Insert default voting settings
INSERT INTO public.voting_settings (setting_key, setting_value, setting_type, description, created_by) VALUES
('default_voting_period_days', '7', 'integer', 'Default voting period in days', '00000000-0000-0000-0000-000000000000'),
('notification_enabled', 'true', 'boolean', 'Enable voting notifications', '00000000-0000-0000-0000-000000000000'),
('quorum_threshold', '25', 'numeric', 'Default quorum threshold percentage', '00000000-0000-0000-0000-000000000000'),
('max_proposal_length', '5000', 'integer', 'Maximum proposal description length', '00000000-0000-0000-0000-000000000000');

-- Insert default eligibility rules
INSERT INTO public.voting_eligibility_rules (
    rule_name, minimum_shares, minimum_holding_period_days, 
    minimum_account_age_days, requires_verification, created_by
) VALUES
('Standard Voting', 1, 0, 0, true, '00000000-0000-0000-0000-000000000000'),
('Major Decisions', 10, 30, 30, true, '00000000-0000-0000-0000-000000000000');

-- Add indexes for performance
CREATE INDEX idx_voting_proposals_status ON public.voting_proposals(status);
CREATE INDEX idx_voting_proposals_dates ON public.voting_proposals(start_date, end_date);
CREATE INDEX idx_voting_proposals_type ON public.voting_proposals(proposal_type);
CREATE INDEX idx_user_votes_proposal ON public.user_votes(proposal_id);
CREATE INDEX idx_user_votes_user ON public.user_votes(user_id);
CREATE INDEX idx_voting_audit_proposal ON public.voting_audit_log(proposal_id);
CREATE INDEX idx_voting_notifications_user ON public.voting_notifications(user_id, is_read);
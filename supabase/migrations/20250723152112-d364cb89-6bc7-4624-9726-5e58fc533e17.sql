-- Add missing voting_options table for proposal choices
CREATE TABLE IF NOT EXISTS public.voting_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.voting_proposals(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER NOT NULL DEFAULT 1,
  vote_count INTEGER NOT NULL DEFAULT 0,
  vote_weight NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(proposal_id, option_order)
);

-- Enable RLS
ALTER TABLE public.voting_options ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for voting_options
CREATE POLICY "Anyone can view voting options for active proposals"
  ON public.voting_options
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voting_proposals vp
      WHERE vp.id = voting_options.proposal_id
      AND vp.status IN ('active', 'closed')
    )
  );

CREATE POLICY "Admins can manage voting options"
  ON public.voting_options
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- Add default voting options for existing proposals
INSERT INTO public.voting_options (proposal_id, option_text, option_order)
SELECT id, 'Yes', 1 FROM public.voting_proposals
WHERE NOT EXISTS (
  SELECT 1 FROM public.voting_options WHERE proposal_id = voting_proposals.id
);

INSERT INTO public.voting_options (proposal_id, option_text, option_order)
SELECT id, 'No', 2 FROM public.voting_proposals
WHERE NOT EXISTS (
  SELECT 1 FROM public.voting_options WHERE proposal_id = voting_proposals.id AND option_order = 2
);

-- Enhanced function to get user voting power
CREATE OR REPLACE FUNCTION public.get_user_voting_power_enhanced(p_user_id UUID)
RETURNS TABLE(
  total_shares INTEGER,
  voting_power NUMERIC,
  share_classes JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(us.quantity), 0)::INTEGER as total_shares,
    COALESCE(SUM(us.quantity), 0)::NUMERIC as voting_power,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'class', 'common',
          'quantity', us.quantity,
          'voting_weight', 1.0
        )
      ) FILTER (WHERE us.quantity > 0),
      '[]'::jsonb
    ) as share_classes
  FROM public.user_shares us
  WHERE us.user_id = p_user_id;
END;
$$;

-- Function to cast enhanced vote
CREATE OR REPLACE FUNCTION public.cast_vote_enhanced(
  p_user_id UUID,
  p_proposal_id UUID,
  p_option_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  proposal_record RECORD;
  user_voting_power NUMERIC;
  existing_vote_id UUID;
  vote_result JSONB;
BEGIN
  -- Get proposal details
  SELECT * INTO proposal_record 
  FROM public.voting_proposals 
  WHERE id = p_proposal_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposal not found');
  END IF;
  
  -- Check if proposal is active
  IF proposal_record.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposal is not active');
  END IF;
  
  -- Check voting period
  IF NOW() < proposal_record.start_date OR NOW() > proposal_record.end_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voting period has ended or not started');
  END IF;
  
  -- Get user voting power
  SELECT total_shares INTO user_voting_power
  FROM public.get_user_voting_power_enhanced(p_user_id);
  
  -- Check minimum shares requirement
  IF user_voting_power < proposal_record.minimum_shares_required THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient shares to vote');
  END IF;
  
  -- Check for existing vote
  SELECT id INTO existing_vote_id 
  FROM public.user_votes 
  WHERE user_id = p_user_id AND proposal_id = p_proposal_id;
  
  IF existing_vote_id IS NOT NULL THEN
    -- Update existing vote
    UPDATE public.user_votes 
    SET 
      option_id = p_option_id,
      voting_power = user_voting_power,
      voted_at = NOW(),
      ip_address = p_ip_address,
      user_agent = p_user_agent,
      updated_at = NOW()
    WHERE id = existing_vote_id;
  ELSE
    -- Insert new vote
    INSERT INTO public.user_votes (
      user_id, proposal_id, option_id, voting_power, 
      voted_at, ip_address, user_agent
    ) VALUES (
      p_user_id, p_proposal_id, p_option_id, user_voting_power,
      NOW(), p_ip_address, p_user_agent
    );
  END IF;
  
  -- Update vote counts in voting_options
  UPDATE public.voting_options 
  SET 
    vote_count = (
      SELECT COUNT(*) FROM public.user_votes 
      WHERE option_id = voting_options.id
    ),
    vote_weight = (
      SELECT COALESCE(SUM(voting_power), 0) FROM public.user_votes 
      WHERE option_id = voting_options.id
    ),
    updated_at = NOW()
  WHERE proposal_id = p_proposal_id;
  
  -- Log the vote action
  INSERT INTO public.voting_audit_log (
    user_id, proposal_id, action_type, action_details
  ) VALUES (
    p_user_id, p_proposal_id, 'vote_cast',
    jsonb_build_object(
      'option_id', p_option_id,
      'voting_power', user_voting_power,
      'ip_address', p_ip_address
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Vote cast successfully',
    'voting_power', user_voting_power
  );
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voting_options_proposal_id ON public.voting_options(proposal_id);
CREATE INDEX IF NOT EXISTS idx_voting_options_proposal_order ON public.voting_options(proposal_id, option_order);
CREATE INDEX IF NOT EXISTS idx_user_votes_option_id ON public.user_votes(option_id);

-- Add realtime for voting tables
ALTER TABLE public.voting_options REPLICA IDENTITY FULL;
ALTER TABLE public.user_votes REPLICA IDENTITY FULL;
ALTER TABLE public.voting_proposals REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.voting_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voting_proposals;
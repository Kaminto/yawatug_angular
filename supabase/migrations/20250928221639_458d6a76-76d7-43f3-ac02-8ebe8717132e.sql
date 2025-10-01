-- Drop existing conflicting functions and recreate them properly
DROP FUNCTION IF EXISTS public.get_user_voting_power(uuid);

-- Function to get user's total voting power
CREATE OR REPLACE FUNCTION public.get_user_voting_power(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_shares INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO total_shares
  FROM public.user_shares 
  WHERE user_id = p_user_id;
  
  RETURN total_shares;
END;
$$;

-- Function to check if user has sufficient shares to vote
CREATE OR REPLACE FUNCTION public.user_has_voting_power(
  p_user_id UUID,
  p_minimum_shares INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_total_shares INTEGER := 0;
BEGIN
  -- Get user's total share count
  SELECT COALESCE(SUM(quantity), 0) INTO user_total_shares
  FROM public.user_shares 
  WHERE user_id = p_user_id;
  
  RETURN user_total_shares >= p_minimum_shares;
END;
$$;

-- Function to cast a vote with validation
CREATE OR REPLACE FUNCTION public.cast_vote(
  p_proposal_id UUID,
  p_option_id UUID,
  p_user_id UUID,
  p_vote_weight INTEGER DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  proposal_record RECORD;
  user_shares INTEGER;
  existing_vote_id UUID;
  vote_weight INTEGER;
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
    RETURN jsonb_build_object('success', false, 'error', 'Voting is not currently active for this proposal');
  END IF;
  
  -- Check voting window
  IF NOW() < proposal_record.start_date OR NOW() > proposal_record.end_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voting period has ended or not yet started');
  END IF;
  
  -- Get user's voting power
  user_shares := get_user_voting_power(p_user_id);
  
  -- Check minimum shares requirement
  IF user_shares < proposal_record.minimum_shares_required THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient shares to vote on this proposal');
  END IF;
  
  -- Use provided weight or default to user's total shares
  vote_weight := COALESCE(p_vote_weight, user_shares);
  
  -- Ensure vote weight doesn't exceed user's actual shares
  vote_weight := LEAST(vote_weight, user_shares);
  
  -- Check if user already voted
  SELECT id INTO existing_vote_id 
  FROM public.user_votes 
  WHERE proposal_id = p_proposal_id AND user_id = p_user_id;
  
  IF existing_vote_id IS NOT NULL THEN
    -- Update existing vote
    UPDATE public.user_votes 
    SET 
      option_id = p_option_id,
      vote_weight = vote_weight,
      updated_at = NOW()
    WHERE id = existing_vote_id;
  ELSE
    -- Create new vote
    INSERT INTO public.user_votes (proposal_id, option_id, user_id, vote_weight)
    VALUES (p_proposal_id, p_option_id, p_user_id, vote_weight);
  END IF;
  
  -- Update voting option counts
  UPDATE public.voting_options 
  SET 
    vote_count = (
      SELECT COUNT(*) 
      FROM public.user_votes 
      WHERE option_id = p_option_id
    ),
    vote_weight = (
      SELECT COALESCE(SUM(vote_weight), 0) 
      FROM public.user_votes 
      WHERE option_id = p_option_id
    )
  WHERE id = p_option_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Vote cast successfully');
END;
$$;
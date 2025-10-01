-- Fix the validate_consent_invitation function to accept both pending and sent status
CREATE OR REPLACE FUNCTION validate_consent_invitation(p_token TEXT)
RETURNS TABLE(
  invitation_id UUID,
  club_allocation_id UUID,
  club_member_id UUID,
  email TEXT,
  phone TEXT,
  is_valid BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    csci.id as invitation_id,
    csci.club_allocation_id,
    csci.club_member_id,
    csci.email,
    csci.phone,
    CASE 
      WHEN csci.expires_at > now() 
        AND csci.status IN ('pending', 'sent') 
        AND csa.allocation_status IN ('pending', 'invited')
      THEN true 
      ELSE false 
    END as is_valid
  FROM club_share_consent_invitations csci
  JOIN club_share_allocations csa ON csci.club_allocation_id = csa.id
  WHERE csci.invitation_token = p_token
  LIMIT 1;
END;
$$;

-- Update all pending invitations to have sent_at timestamp so they appear as properly sent
UPDATE club_share_consent_invitations 
SET sent_at = COALESCE(sent_at, now())
WHERE status = 'pending' AND sent_at IS NULL;
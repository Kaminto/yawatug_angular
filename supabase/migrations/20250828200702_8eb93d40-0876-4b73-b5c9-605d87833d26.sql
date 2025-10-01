-- Fix the validation function to accept both pending and sent status
-- and create missing functions for proper invitation management

-- Update the validate_consent_invitation function to accept pending status
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

-- Create function to generate consent invitation
CREATE OR REPLACE FUNCTION generate_consent_invitation(
  p_club_allocation_id UUID,
  p_club_member_id UUID, 
  p_email TEXT,
  p_phone TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_token TEXT;
  expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate a secure random token
  invitation_token := encode(gen_random_bytes(32), 'hex');
  expires_at := now() + INTERVAL '30 days';
  
  -- Insert the invitation record and update status to sent
  INSERT INTO club_share_consent_invitations (
    club_allocation_id,
    club_member_id,
    invitation_token,
    email,
    phone,
    expires_at,
    status,
    sent_at
  ) VALUES (
    p_club_allocation_id,
    p_club_member_id,
    invitation_token,
    p_email,
    p_phone,
    expires_at,
    'sent',
    now()
  );
  
  -- Update allocation status to invited
  UPDATE club_share_allocations 
  SET allocation_status = 'invited'
  WHERE id = p_club_allocation_id;
  
  RETURN invitation_token;
END;
$$;

-- Update existing pending invitations to sent status
UPDATE club_share_consent_invitations 
SET status = 'sent', sent_at = COALESCE(sent_at, now())
WHERE status = 'pending';
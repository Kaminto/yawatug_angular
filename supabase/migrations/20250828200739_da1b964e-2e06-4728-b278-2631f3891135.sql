-- Drop and recreate the generate_consent_invitation function
DROP FUNCTION IF EXISTS generate_consent_invitation(uuid, uuid, text, text);

-- Create the proper generate_consent_invitation function
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
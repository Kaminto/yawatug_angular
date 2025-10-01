-- Create function to validate consent invitation tokens
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    csi.id as invitation_id,
    csi.club_allocation_id,
    icm.id as club_member_id,
    icm.email,
    icm.phone,
    CASE 
      WHEN csi.expires_at > now() 
        AND csi.status = 'sent' 
        AND csa.allocation_status IN ('pending', 'invited')
      THEN true 
      ELSE false 
    END as is_valid
  FROM club_share_invitations csi
  JOIN club_share_allocations csa ON csi.club_allocation_id = csa.id
  JOIN investment_club_members icm ON csa.club_member_id = icm.id
  WHERE csi.invitation_token = p_token
  LIMIT 1;
END;
$$;
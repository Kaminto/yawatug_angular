-- Create the validate_consent_invitation function that the ConsentForm is expecting
CREATE OR REPLACE FUNCTION public.validate_consent_invitation(p_token text)
RETURNS TABLE(
  invitation_id uuid,
  club_allocation_id uuid, 
  club_member_id uuid,
  email text,
  phone text,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cci.id as invitation_id,
    cci.club_allocation_id,
    cci.club_member_id,
    cci.email,
    cci.phone,
    CASE 
      WHEN cci.status IN ('pending', 'sent') AND cci.expires_at > now() THEN true
      ELSE false
    END as is_valid
  FROM club_consent_invitations cci
  WHERE cci.invitation_token = p_token;
END;
$function$
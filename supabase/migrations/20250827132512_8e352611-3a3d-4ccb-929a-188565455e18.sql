-- Create the missing generate_consent_invitation database function
CREATE OR REPLACE FUNCTION public.generate_consent_invitation(
  p_club_allocation_id uuid,
  p_club_member_id uuid,
  p_email text,
  p_phone text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  invitation_token text;
  expires_at timestamp with time zone;
BEGIN
  -- Generate a secure random token using gen_random_uuid() and encode as base64
  invitation_token := encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64');
  expires_at := now() + interval '30 days';
  
  -- Insert or update consent invitation record
  INSERT INTO public.club_share_consent_invitations (
    club_allocation_id,
    club_member_id,
    email,
    phone,
    invitation_token,
    expires_at,
    status
  ) VALUES (
    p_club_allocation_id,
    p_club_member_id,
    p_email,
    p_phone,
    invitation_token,
    expires_at,
    'pending'
  )
  ON CONFLICT (club_allocation_id) 
  DO UPDATE SET
    invitation_token = EXCLUDED.invitation_token,
    expires_at = EXCLUDED.expires_at,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    status = 'pending',
    updated_at = now();
  
  RETURN invitation_token;
END;
$function$;
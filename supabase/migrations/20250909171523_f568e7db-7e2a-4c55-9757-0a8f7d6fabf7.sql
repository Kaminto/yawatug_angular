-- Fix invitation token generation to properly handle multiple invitations
-- Update the generate_invitation_token function to invalidate previous tokens

CREATE OR REPLACE FUNCTION public.generate_invitation_token(p_user_id UUID, p_created_by UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token TEXT;
  expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate a secure random token
  token := encode(gen_random_bytes(32), 'base64');
  expires_at := now() + INTERVAL '7 days';
  
  -- Mark all previous invitation tokens for this user as expired/used
  UPDATE public.imported_user_invitations 
  SET status = 'superseded', 
      updated_at = now()
  WHERE user_id = p_user_id 
    AND status = 'pending';
  
  -- Insert the new invitation record
  INSERT INTO public.imported_user_invitations (
    user_id, invitation_token, expires_at, created_by, status
  ) VALUES (
    p_user_id, token, expires_at, p_created_by, 'pending'
  );
  
  -- Update profile with new token and expiration
  UPDATE public.profiles 
  SET account_activation_status = 'invited',
      first_login_token = token,
      first_login_token_expires_at = expires_at,
      updated_at = now()
  WHERE id = p_user_id;
  
  RETURN token;
END;
$$;
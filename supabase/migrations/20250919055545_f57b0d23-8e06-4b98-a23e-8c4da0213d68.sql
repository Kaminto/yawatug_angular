-- Add debug logging to the validate_invitation_token_enhanced function
CREATE OR REPLACE FUNCTION public.validate_invitation_token_enhanced(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
  profile_record RECORD;
  original_token text := p_token;
BEGIN
  -- Log the original token for debugging
  RAISE LOG 'validate_invitation_token_enhanced called with token: %', substring(p_token, 1, 10) || '...';
  
  -- Clean the token (remove any URL encoding)
  p_token := replace(replace(p_token, '%2B', '+'), '%2F', '/');
  p_token := replace(replace(p_token, '%3D', '='), '%0A', '');
  p_token := trim(p_token);
  
  RAISE LOG 'Cleaned token: %', substring(p_token, 1, 10) || '...';
  
  -- Find the invitation record - check both tables
  SELECT * INTO invitation_record
  FROM public.imported_user_invitations
  WHERE invitation_token = p_token
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  RAISE LOG 'Found in imported_user_invitations: %', FOUND;
  
  -- If not found in invitations, check profiles first_login_token
  IF NOT FOUND THEN
    RAISE LOG 'Checking profiles table for token';
    
    SELECT id as user_id, first_login_token as invitation_token, 
           first_login_token_expires_at as expires_at, 'pending' as status
    INTO invitation_record
    FROM public.profiles
    WHERE first_login_token = p_token
      AND first_login_token_expires_at > now()
      AND account_activation_status = 'invited'
    LIMIT 1;
    
    RAISE LOG 'Found in profiles: %', FOUND;
  END IF;
  
  IF NOT FOUND THEN
    -- Try to find with any status to give better error message
    RAISE LOG 'Token not found with active status, checking all statuses';
    
    SELECT * INTO invitation_record
    FROM public.imported_user_invitations
    WHERE invitation_token = p_token
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
      -- Also check profiles table
      SELECT id as user_id, first_login_token as invitation_token, 
             first_login_token_expires_at as expires_at, 
             CASE WHEN account_activation_status = 'activated' THEN 'used' ELSE 'pending' END as status
      INTO invitation_record
      FROM public.profiles
      WHERE first_login_token = p_token
      LIMIT 1;
    END IF;
    
    IF NOT FOUND THEN
      RAISE LOG 'Token not found in any table: %', substring(p_token, 1, 10) || '...';
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid invitation token'
      );
    ELSIF invitation_record.expires_at <= now() THEN
      RAISE LOG 'Token expired: % <= %', invitation_record.expires_at, now();
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invitation token has expired'
      );
    ELSIF invitation_record.status != 'pending' THEN
      RAISE LOG 'Token already used: status = %', invitation_record.status;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invitation token has already been used'
      );
    ELSE
      RAISE LOG 'Token found but not valid for unknown reason';
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invitation token is not valid'
      );
    END IF;
  END IF;
  
  RAISE LOG 'Token validation successful for user: %', invitation_record.user_id;
  
  -- Get profile details
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = invitation_record.user_id;
  
  IF NOT FOUND THEN
    RAISE LOG 'Profile not found for user: %', invitation_record.user_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found'
    );
  END IF;
  
  RAISE LOG 'Returning success for user: % (%)', profile_record.full_name, profile_record.email;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', invitation_record.user_id,
    'email', profile_record.email,
    'full_name', profile_record.full_name,
    'expires_at', invitation_record.expires_at
  );
END;
$$;
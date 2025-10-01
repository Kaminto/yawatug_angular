-- Step 1: Fix token generation consistency - reuse existing pending tokens
-- Update generate_invitation_token function to reuse existing valid tokens

CREATE OR REPLACE FUNCTION public.generate_invitation_token(
  p_user_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token TEXT;
  expires_at TIMESTAMP WITH TIME ZONE;
  existing_token_record RECORD;
BEGIN
  -- Check if there's already a valid pending token for this user
  SELECT * INTO existing_token_record
  FROM public.imported_user_invitations
  WHERE user_id = p_user_id 
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If we have a valid existing token, return it
  IF existing_token_record IS NOT NULL THEN
    RAISE LOG 'Reusing existing token for user %', p_user_id;
    RETURN existing_token_record.invitation_token;
  END IF;
  
  -- Mark any old tokens as expired for this user
  UPDATE public.imported_user_invitations
  SET status = 'expired', updated_at = now()
  WHERE user_id = p_user_id 
    AND status = 'pending';
  
  -- Generate new token and expiration (24 hours from now)
  token := encode(gen_random_bytes(32), 'base64');
  expires_at := now() + INTERVAL '24 hours';
  
  -- Insert new invitation record
  INSERT INTO public.imported_user_invitations (
    user_id,
    invitation_token,
    expires_at,
    status,
    created_by
  ) VALUES (
    p_user_id,
    token,
    expires_at,
    'pending',
    COALESCE(p_created_by, auth.uid())
  );
  
  -- Also update the profile's first_login_token for fallback compatibility
  UPDATE public.profiles SET 
    first_login_token = token,
    first_login_token_expires_at = expires_at
  WHERE id = p_user_id;
  
  RAISE LOG 'Generated new token for user %', p_user_id;
  RETURN token;
END;
$$;

-- Step 2: Improve token validation with better logging and encoding handling
-- Update validate_invitation_token to handle URL encoding and add grace period

CREATE OR REPLACE FUNCTION public.validate_invitation_token_enhanced(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
  decoded_token TEXT;
  result JSONB;
BEGIN
  RAISE LOG 'Validating token: %', p_token;
  
  -- Try direct token match first
  SELECT * INTO invitation_record
  FROM public.imported_user_invitations
  WHERE invitation_token = p_token
    AND status = 'pending';
    
  -- If not found, try URL decoding the token (handle %2B, %2F, %3D, etc.)
  IF invitation_record IS NULL THEN
    -- Simple URL decode for common characters
    decoded_token := replace(replace(replace(p_token, '%2B', '+'), '%2F', '/'), '%3D', '=');
    
    SELECT * INTO invitation_record
    FROM public.imported_user_invitations
    WHERE invitation_token = decoded_token
      AND status = 'pending';
      
    RAISE LOG 'Tried decoded token: %, found: %', decoded_token, (invitation_record IS NOT NULL);
  END IF;
  
  -- If still not found, check for recently expired tokens (grace period of 1 hour)
  IF invitation_record IS NULL THEN
    SELECT * INTO invitation_record
    FROM public.imported_user_invitations
    WHERE (invitation_token = p_token OR invitation_token = decoded_token)
      AND status IN ('pending', 'expired')
      AND expires_at > (now() - INTERVAL '1 hour')
    ORDER BY expires_at DESC
    LIMIT 1;
    
    RAISE LOG 'Checked grace period, found: %', (invitation_record IS NOT NULL);
  END IF;
  
  IF invitation_record IS NULL THEN
    RAISE LOG 'No valid invitation found for token';
    RETURN jsonb_build_object(
      'success', false,
      'user_id', null,
      'error', 'Invalid or expired invitation token'
    );
  END IF;
  
  -- Check if token is still valid (not expired)
  IF invitation_record.expires_at <= now() THEN
    RAISE LOG 'Token expired at: %, current time: %', invitation_record.expires_at, now();
    
    -- If within grace period, allow it
    IF invitation_record.expires_at > (now() - INTERVAL '1 hour') THEN
      RAISE LOG 'Token in grace period, allowing validation';
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'user_id', null,
        'error', 'Token has expired'
      );
    END IF;
  END IF;
  
  RAISE LOG 'Token validated successfully for user: %', invitation_record.user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', invitation_record.user_id,
    'expires_at', invitation_record.expires_at
  );
END;
$$;

-- Keep the original function for backward compatibility but make it use the enhanced version
CREATE OR REPLACE FUNCTION public.validate_invitation_token(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  result := public.validate_invitation_token_enhanced(p_token);
  
  IF (result->>'success')::boolean THEN
    RETURN (result->>'user_id')::UUID;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;
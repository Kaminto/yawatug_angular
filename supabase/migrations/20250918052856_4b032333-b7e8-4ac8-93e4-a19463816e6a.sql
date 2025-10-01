-- Fix activation token generation (remove unsupported base64url) and simplify activation URL builder

-- 1) Replace generate_invitation_token to use URL-safe hex tokens
CREATE OR REPLACE FUNCTION public.generate_invitation_token(p_user_id uuid, p_created_by uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  -- Generate a URL-safe token (64 hex chars)
  token := encode(gen_random_bytes(32), 'hex');
  expires_at := now() + INTERVAL '7 days';

  -- Upsert invitation record
  INSERT INTO public.imported_user_invitations (
    user_id, invitation_token, expires_at, status, created_by
  ) VALUES (
    p_user_id, token, expires_at, 'pending', p_created_by
  )
  ON CONFLICT (invitation_token) DO NOTHING;

  -- Update profile status and first login token
  UPDATE public.profiles 
  SET account_activation_status = 'invited',
      first_login_token = token,
      first_login_token_expires_at = expires_at,
      updated_at = now()
  WHERE id = p_user_id;

  RETURN token;
END;
$$;

-- 2) Replace build_activation_url to avoid unsupported encodings
CREATE OR REPLACE FUNCTION public.build_activation_url(p_token text, p_base_url text DEFAULT 'https://yawatug.com')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN rtrim(p_base_url, '/') || '/activate-account?token=' || p_token;
END;
$$;

-- 3) Optional: ensure validate_invitation_token_enhanced keeps working with new token format (no change needed as it does exact match)
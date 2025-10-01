-- Create missing transaction_fee_collections table that is still referenced in code
CREATE TABLE IF NOT EXISTS public.transaction_fee_collections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL,
    user_id uuid NOT NULL,
    fee_amount numeric DEFAULT 0,
    fee_percentage numeric DEFAULT 0,
    flat_fee numeric DEFAULT 0,
    currency text DEFAULT 'UGX',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transaction_fee_collections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own transaction fee collections"
ON public.transaction_fee_collections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transaction fee collections"
ON public.transaction_fee_collections
FOR ALL
USING (is_admin(auth.uid()));

-- Fix validate_invitation_token_enhanced to work with hex tokens from new generation function
CREATE OR REPLACE FUNCTION public.validate_invitation_token_enhanced(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
  profile_record RECORD;
BEGIN
  -- Clean the token (remove any URL encoding)
  p_token := replace(replace(p_token, '%2B', '+'), '%2F', '/');
  p_token := replace(replace(p_token, '%3D', '='), '%0A', '');
  p_token := trim(p_token);
  
  -- Find the invitation record - check both tables
  SELECT * INTO invitation_record
  FROM public.imported_user_invitations
  WHERE invitation_token = p_token
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If not found in invitations, check profiles first_login_token
  IF NOT FOUND THEN
    SELECT id as user_id, first_login_token as invitation_token, 
           first_login_token_expires_at as expires_at, 'pending' as status
    INTO invitation_record
    FROM public.profiles
    WHERE first_login_token = p_token
      AND first_login_token_expires_at > now()
      AND account_activation_status = 'invited'
    LIMIT 1;
  END IF;
  
  IF NOT FOUND THEN
    -- Try to find with any status to give better error message
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
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid invitation token'
      );
    ELSIF invitation_record.expires_at <= now() THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invitation token has expired'
      );
    ELSIF invitation_record.status != 'pending' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invitation token has already been used'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invitation token is not valid'
      );
    END IF;
  END IF;
  
  -- Get profile details
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = invitation_record.user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', invitation_record.user_id,
    'email', profile_record.email,
    'full_name', profile_record.full_name,
    'expires_at', invitation_record.expires_at
  );
END;
$$;
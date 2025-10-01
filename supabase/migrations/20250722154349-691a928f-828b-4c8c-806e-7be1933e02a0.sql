
-- Add activation tracking and improve imported user management
CREATE TABLE IF NOT EXISTS public.auth_profile_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  auth_user_id UUID,
  sync_status TEXT CHECK (sync_status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auth_profile_sync_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage sync log" ON public.auth_profile_sync_log
  FOR ALL USING (is_admin(auth.uid()));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_auth_profile_sync_profile_id ON public.auth_profile_sync_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_auth_profile_sync_status ON public.auth_profile_sync_log(sync_status);

-- Update existing function to support lazy auth creation
CREATE OR REPLACE FUNCTION public.check_user_auth_status(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_record RECORD;
  auth_user_exists BOOLEAN := FALSE;
  result JSONB;
BEGIN
  -- Check if profile exists
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE email = p_email
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'profile_exists', false,
      'auth_exists', false,
      'needs_auth_creation', false,
      'is_imported', false
    );
  END IF;
  
  -- Check if auth user exists by looking for successful logins or auth_created_at
  auth_user_exists := (
    profile_record.auth_created_at IS NOT NULL OR 
    profile_record.login_count > 0
  );
  
  -- Determine if this is an imported user needing auth creation
  result := jsonb_build_object(
    'profile_exists', true,
    'auth_exists', auth_user_exists,
    'needs_auth_creation', (profile_record.import_batch_id IS NOT NULL AND NOT auth_user_exists),
    'is_imported', (profile_record.import_batch_id IS NOT NULL),
    'profile', jsonb_build_object(
      'id', profile_record.id,
      'email', profile_record.email,
      'full_name', profile_record.full_name,
      'account_activation_status', profile_record.account_activation_status
    )
  );
  
  RETURN result;
END;
$$;

-- Function to create auth account for imported user
CREATE OR REPLACE FUNCTION public.create_auth_account_for_imported_user(
  p_profile_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_activation_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_record RECORD;
  sync_log_id UUID;
BEGIN
  -- Validate activation token
  IF public.validate_invitation_token(p_activation_token) != p_profile_id THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invalid or expired activation token'
    );
  END IF;
  
  -- Get profile
  SELECT * INTO profile_record FROM public.profiles WHERE id = p_profile_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Profile not found'
    );
  END IF;
  
  -- Create sync log entry
  INSERT INTO public.auth_profile_sync_log (
    profile_id, sync_status, attempt_count
  ) VALUES (
    p_profile_id, 'pending', 1
  ) RETURNING id INTO sync_log_id;
  
  -- Mark invitation as used
  UPDATE public.imported_user_invitations
  SET status = 'used', used_at = now()
  WHERE invitation_token = p_activation_token;
  
  -- Update profile status
  UPDATE public.profiles
  SET 
    account_activation_status = 'activated',
    auth_created_at = now(),
    first_login_token = NULL,
    first_login_token_expires_at = NULL,
    updated_at = now()
  WHERE id = p_profile_id;
  
  -- Update sync log
  UPDATE public.auth_profile_sync_log
  SET 
    sync_status = 'success',
    last_attempt_at = now(),
    updated_at = now()
  WHERE id = sync_log_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Auth account creation initiated',
    'profile_id', p_profile_id
  );
END;
$$;

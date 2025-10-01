
-- Add columns to track imported user authentication status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_login_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_login_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_activation_status TEXT DEFAULT 'pending' CHECK (account_activation_status IN ('pending', 'invited', 'activated'));

-- Create a table to track imported user invitations
CREATE TABLE IF NOT EXISTS public.imported_user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.imported_user_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for imported_user_invitations
CREATE POLICY "Admins can manage all invitations" ON public.imported_user_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Users can view their own invitations" ON public.imported_user_invitations
  FOR SELECT USING (user_id = auth.uid());

-- Create function to generate secure invitation tokens
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
  
  -- Insert the invitation record
  INSERT INTO public.imported_user_invitations (
    user_id, invitation_token, expires_at, created_by
  ) VALUES (
    p_user_id, token, expires_at, p_created_by
  );
  
  -- Update profile status
  UPDATE public.profiles 
  SET account_activation_status = 'invited',
      first_login_token = token,
      first_login_token_expires_at = expires_at
  WHERE id = p_user_id;
  
  RETURN token;
END;
$$;

-- Create function to validate invitation token
CREATE OR REPLACE FUNCTION public.validate_invitation_token(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM public.imported_user_invitations
  WHERE invitation_token = p_token
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  RETURN invitation_record.user_id;
END;
$$;

-- Create function to create auth user for imported profile
CREATE OR REPLACE FUNCTION public.create_auth_for_imported_user(
  p_user_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_invitation_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  profile_record RECORD;
BEGIN
  -- Validate the invitation token
  IF public.validate_invitation_token(p_invitation_token) != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation token');
  END IF;
  
  -- Get profile details
  SELECT * INTO profile_record FROM public.profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  -- Mark invitation as used
  UPDATE public.imported_user_invitations
  SET status = 'used', used_at = now()
  WHERE invitation_token = p_invitation_token;
  
  -- Update profile
  UPDATE public.profiles
  SET 
    account_activation_status = 'activated',
    auth_created_at = now(),
    first_login_token = NULL,
    first_login_token_expires_at = NULL
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Auth account created successfully');
END;
$$;

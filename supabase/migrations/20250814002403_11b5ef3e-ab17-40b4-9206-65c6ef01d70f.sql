-- Create consent management tables
CREATE TABLE IF NOT EXISTS public.club_share_consent_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_allocation_id UUID NOT NULL REFERENCES public.club_share_allocations(id) ON DELETE CASCADE,
  club_member_id UUID NOT NULL,
  invitation_token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  sent_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create consent signatures table
CREATE TABLE IF NOT EXISTS public.club_share_consent_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id UUID NOT NULL REFERENCES public.club_share_consent_invitations(id) ON DELETE CASCADE,
  club_allocation_id UUID NOT NULL REFERENCES public.club_share_allocations(id) ON DELETE CASCADE,
  club_member_id UUID NOT NULL,
  user_id UUID,  -- Will be filled when profile is created
  digital_signature TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  consent_text TEXT NOT NULL,
  consent_given_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profile creation log for consent flow
CREATE TABLE IF NOT EXISTS public.consent_profile_creation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id UUID NOT NULL REFERENCES public.club_share_consent_invitations(id),
  club_member_id UUID NOT NULL,
  user_id UUID,
  profile_created BOOLEAN DEFAULT FALSE,
  wallets_created BOOLEAN DEFAULT FALSE,
  auth_account_created BOOLEAN DEFAULT FALSE,
  creation_status TEXT DEFAULT 'pending' CHECK (creation_status IN ('pending', 'completed', 'failed')),
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.club_share_consent_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_share_consent_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_profile_creation_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for consent invitations
CREATE POLICY "Users can view their own consent invitations"
ON public.club_share_consent_invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.investment_club_members icm 
    WHERE icm.id = club_member_id AND icm.user_id = auth.uid()
  ) OR
  -- Allow access via invitation token for unauthenticated users
  TRUE
);

CREATE POLICY "Admins can manage consent invitations"
ON public.club_share_consent_invitations FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create RLS policies for consent signatures
CREATE POLICY "Users can view their own consent signatures"
ON public.club_share_consent_signatures FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own consent signatures"
ON public.club_share_consent_signatures FOR INSERT
WITH CHECK (TRUE); -- Allow unauthenticated creation during consent process

CREATE POLICY "Admins can view all consent signatures"
ON public.club_share_consent_signatures FOR SELECT
USING (is_admin(auth.uid()));

-- Create RLS policies for profile creation log
CREATE POLICY "Admins can manage profile creation log"
ON public.consent_profile_creation_log FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create function to generate consent invitation
CREATE OR REPLACE FUNCTION public.generate_consent_invitation(
  p_club_allocation_id UUID,
  p_club_member_id UUID,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  invitation_token TEXT;
  expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate secure random token
  invitation_token := encode(gen_random_bytes(32), 'base64url');
  expires_at := now() + INTERVAL '30 days';
  
  -- Insert invitation record
  INSERT INTO public.club_share_consent_invitations (
    club_allocation_id,
    club_member_id,
    invitation_token,
    email,
    phone,
    expires_at
  ) VALUES (
    p_club_allocation_id,
    p_club_member_id,
    invitation_token,
    p_email,
    p_phone,
    expires_at
  );
  
  RETURN invitation_token;
END;
$function$;

-- Create function to validate consent invitation
CREATE OR REPLACE FUNCTION public.validate_consent_invitation(p_token TEXT)
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
SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    csi.id,
    csi.club_allocation_id,
    csi.club_member_id,
    csi.email,
    csi.phone,
    (csi.status = 'pending' AND csi.expires_at > now()) as is_valid
  FROM public.club_share_consent_invitations csi
  WHERE csi.invitation_token = p_token;
END;
$function$;

-- Create function to process consent acceptance
CREATE OR REPLACE FUNCTION public.process_consent_acceptance(
  p_invitation_token TEXT,
  p_digital_signature TEXT,
  p_consent_text TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  invitation_record RECORD;
  signature_id UUID;
  member_record RECORD;
  profile_id UUID;
  wallet_ids UUID[];
  log_id UUID;
BEGIN
  -- Validate invitation
  SELECT * INTO invitation_record
  FROM public.club_share_consent_invitations
  WHERE invitation_token = p_invitation_token
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;
  
  -- Get club member details
  SELECT * INTO member_record
  FROM public.investment_club_members
  WHERE id = invitation_record.club_member_id;
  
  -- Create consent signature
  INSERT INTO public.club_share_consent_signatures (
    invitation_id,
    club_allocation_id,
    club_member_id,
    digital_signature,
    ip_address,
    user_agent,
    consent_text
  ) VALUES (
    invitation_record.id,
    invitation_record.club_allocation_id,
    invitation_record.club_member_id,
    p_digital_signature,
    p_ip_address,
    p_user_agent,
    p_consent_text
  ) RETURNING id INTO signature_id;
  
  -- Create profile creation log
  INSERT INTO public.consent_profile_creation_log (
    invitation_id,
    club_member_id
  ) VALUES (
    invitation_record.id,
    invitation_record.club_member_id
  ) RETURNING id INTO log_id;
  
  -- Create/update profile if not exists
  IF member_record.user_id IS NULL THEN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      phone,
      import_batch_id,
      account_activation_status,
      first_login_token,
      first_login_token_expires_at,
      consent_signature_id
    ) VALUES (
      gen_random_uuid(),
      invitation_record.email,
      member_record.member_name,
      invitation_record.phone,
      'consent_' || invitation_record.id,
      'invited',
      invitation_record.invitation_token,
      invitation_record.expires_at,
      signature_id
    ) RETURNING id INTO profile_id;
    
    -- Update club member with user_id
    UPDATE public.investment_club_members
    SET user_id = profile_id
    WHERE id = invitation_record.club_member_id;
    
    -- Create default wallets
    INSERT INTO public.wallets (user_id, currency, balance, status)
    VALUES 
      (profile_id, 'USD', 0, 'active'),
      (profile_id, 'UGX', 0, 'active')
    RETURNING ARRAY_AGG(id) INTO wallet_ids;
    
    -- Update signature with user_id
    UPDATE public.club_share_consent_signatures
    SET user_id = profile_id
    WHERE id = signature_id;
    
    -- Update log
    UPDATE public.consent_profile_creation_log
    SET 
      user_id = profile_id,
      profile_created = TRUE,
      wallets_created = TRUE,
      creation_status = 'completed'
    WHERE id = log_id;
  ELSE
    -- Update existing profile if needed
    UPDATE public.profiles
    SET consent_signature_id = signature_id
    WHERE id = member_record.user_id;
    
    profile_id := member_record.user_id;
  END IF;
  
  -- Update invitation status
  UPDATE public.club_share_consent_invitations
  SET 
    status = 'accepted',
    responded_at = now()
  WHERE id = invitation_record.id;
  
  -- Update allocation status
  UPDATE public.club_share_allocations
  SET 
    allocation_status = 'accepted',
    consent_signed_at = now()
  WHERE id = invitation_record.club_allocation_id;
  
  -- Create holding account
  INSERT INTO public.club_share_holding_account (
    club_member_id,
    club_allocation_id,
    shares_quantity,
    status
  ) VALUES (
    invitation_record.club_member_id,
    invitation_record.club_allocation_id,
    (SELECT allocated_shares FROM public.club_share_allocations WHERE id = invitation_record.club_allocation_id),
    'holding'
  );
  
  RETURN profile_id;
END;
$function$;

-- Add consent_signature_id to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'consent_signature_id') THEN
    ALTER TABLE public.profiles ADD COLUMN consent_signature_id UUID REFERENCES public.club_share_consent_signatures(id);
  END IF;
END $$;
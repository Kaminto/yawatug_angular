-- Create missing transaction_fee_collections table
CREATE TABLE IF NOT EXISTS public.transaction_fee_collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid,
  user_id uuid,
  transaction_type text NOT NULL,
  base_amount numeric NOT NULL DEFAULT 0,
  fee_percentage numeric NOT NULL DEFAULT 0,
  flat_fee numeric NOT NULL DEFAULT 0,
  calculated_fee numeric NOT NULL DEFAULT 0,
  actual_fee_collected numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'UGX',
  allocation_status text NOT NULL DEFAULT 'pending',
  fee_settings_snapshot jsonb DEFAULT '{}',
  admin_fund_allocated numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for transaction fee collections
ALTER TABLE public.transaction_fee_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage transaction fee collections"
ON public.transaction_fee_collections
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own transaction fee collections"
ON public.transaction_fee_collections
FOR SELECT
USING (auth.uid() = user_id);

-- Create or replace the enhanced validation function for invitation tokens
CREATE OR REPLACE FUNCTION public.validate_invitation_token_enhanced(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  decoded_data jsonb;
  user_id_from_token uuid;
  token_created_at timestamp with time zone;
  invitation_record record;
BEGIN
  -- Decode the base64 token
  BEGIN
    decoded_data := convert_from(decode(p_token, 'base64'), 'UTF8')::jsonb;
    user_id_from_token := (decoded_data->>'user_id')::uuid;
    token_created_at := (decoded_data->>'created_at')::timestamp with time zone;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token format');
  END;
  
  -- Check if token is too old (48 hours)
  IF token_created_at < now() - INTERVAL '48 hours' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token has expired');
  END IF;
  
  -- Check if user exists
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id_from_token) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid user');
  END IF;
  
  -- Check invitation record exists and is not used
  SELECT * INTO invitation_record
  FROM public.imported_user_invitations
  WHERE invitation_token = p_token
  AND status != 'used';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token has already been used');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'user_id', user_id_from_token,
    'email', (SELECT email FROM public.profiles WHERE id = user_id_from_token)
  );
END;
$$;

-- Fix consent management by updating allocation status when profiles are imported
CREATE OR REPLACE FUNCTION public.update_allocation_consent_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a profile is created with import_batch_id, update related allocations
  IF NEW.import_batch_id IS NOT NULL THEN
    UPDATE public.club_share_allocations 
    SET allocation_status = 'pending_consent'
    WHERE club_member_id IN (
      SELECT id FROM public.investment_club_members 
      WHERE email = NEW.email OR phone = NEW.phone
    )
    AND allocation_status = 'pending_activation';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for consent management
DROP TRIGGER IF EXISTS trigger_update_allocation_consent_status ON public.profiles;
CREATE TRIGGER trigger_update_allocation_consent_status
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_allocation_consent_status();
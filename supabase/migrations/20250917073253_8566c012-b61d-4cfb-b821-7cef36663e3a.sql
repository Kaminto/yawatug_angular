-- Fix transaction fee allocation function to work without transaction_fee_collections table
CREATE OR REPLACE FUNCTION public.allocate_transaction_fee_with_snapshot(
    p_transaction_id uuid, 
    p_user_id uuid, 
    p_transaction_type text, 
    p_base_amount numeric, 
    p_currency text DEFAULT 'UGX'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fee_settings RECORD;
  calculated_fee NUMERIC := 0;
  percentage_component NUMERIC := 0;
  flat_component NUMERIC := 0;
  final_fee NUMERIC := 0;
  admin_fund_id UUID;
BEGIN
  -- Get current fee settings
  SELECT 
    percentage_fee,
    flat_fee,
    minimum_fee,
    maximum_fee,
    fee_type
  INTO fee_settings 
  FROM transaction_fee_settings
  WHERE transaction_type = p_transaction_type
    AND currency = p_currency
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF fee_settings IS NOT NULL THEN
    -- Calculate percentage component
    percentage_component := (p_base_amount * COALESCE(fee_settings.percentage_fee, 0)) / 100;
    
    -- Get flat component
    flat_component := COALESCE(fee_settings.flat_fee, 0);
    
    -- Calculate total fee
    calculated_fee := percentage_component + flat_component;
    
    -- Apply minimum and maximum limits
    IF fee_settings.minimum_fee > 0 THEN
      calculated_fee := GREATEST(calculated_fee, fee_settings.minimum_fee);
    END IF;
    
    IF fee_settings.maximum_fee > 0 THEN
      calculated_fee := LEAST(calculated_fee, fee_settings.maximum_fee);
    END IF;
    
    final_fee := calculated_fee;
    
    -- Update the transaction record with fee information
    UPDATE transactions 
    SET 
      fee_amount = final_fee,
      fee_percentage = fee_settings.percentage_fee,
      flat_fee = fee_settings.flat_fee
    WHERE id = p_transaction_id;
  END IF;

  -- Get admin fund wallet and allocate fee
  SELECT id INTO admin_fund_id
  FROM admin_sub_wallets
  WHERE wallet_type = 'admin_fund' AND currency = p_currency
  LIMIT 1;

  -- Allocate fee to admin fund if exists and fee > 0
  IF admin_fund_id IS NOT NULL AND final_fee > 0 THEN
    UPDATE admin_sub_wallets 
    SET balance = balance + final_fee,
        updated_at = now()
    WHERE id = admin_fund_id;
        
    -- Record the transfer
    INSERT INTO admin_wallet_fund_transfers (
      to_wallet_id, amount, currency, transfer_type, description, reference
    ) VALUES (
      admin_fund_id, final_fee, p_currency, 'fee_allocation', 
      'Transaction fee allocation', p_transaction_id::TEXT
    );
  END IF;

  RETURN p_transaction_id;
END;
$$;

-- Ensure generate_invitation_token function exists
CREATE OR REPLACE FUNCTION public.generate_invitation_token(p_user_id uuid, p_created_by uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a secure random token
  token := encode(gen_random_bytes(32), 'base64url');
  
  -- Store the invitation with expiry (24 hours from now)
  INSERT INTO public.imported_user_invitations (
    user_id, 
    invitation_token, 
    expires_at, 
    status,
    created_by
  ) VALUES (
    p_user_id, 
    token, 
    now() + INTERVAL '24 hours',
    'pending',
    p_created_by
  )
  ON CONFLICT (user_id) DO UPDATE SET
    invitation_token = EXCLUDED.invitation_token,
    expires_at = EXCLUDED.expires_at,
    status = 'pending',
    updated_at = now(),
    created_by = EXCLUDED.created_by;
  
  RETURN token;
END;
$$;

-- Ensure validate_invitation_token_enhanced function exists and works properly
CREATE OR REPLACE FUNCTION public.validate_invitation_token_enhanced(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
  profile_record RECORD;
BEGIN
  -- Handle URL decoding if needed
  p_token := replace(replace(p_token, '%2B', '+'), '%2F', '/');
  p_token := replace(replace(p_token, '%3D', '='), '%0A', '');
  
  -- Find the invitation record
  SELECT * INTO invitation_record
  FROM public.imported_user_invitations
  WHERE invitation_token = p_token
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Try to find with any status to give better error message
    SELECT * INTO invitation_record
    FROM public.imported_user_invitations
    WHERE invitation_token = p_token
    ORDER BY created_at DESC
    LIMIT 1;
    
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
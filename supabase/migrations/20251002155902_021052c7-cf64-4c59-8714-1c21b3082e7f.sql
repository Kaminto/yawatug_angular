-- Fix handle_new_user to properly extract and set all metadata from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_full_name TEXT;
  v_account_type TEXT;
  v_referral_code TEXT;
  v_phone_exists BOOLEAN := FALSE;
BEGIN
  -- Extract data from auth metadata
  v_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual');
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';

  -- Check if phone already exists on another profile
  IF v_phone IS NOT NULL AND length(trim(v_phone)) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.phone = v_phone AND p.id <> NEW.id
    ) INTO v_phone_exists;
  END IF;

  -- Insert or update profile with all metadata
  INSERT INTO public.profiles (
    id, 
    email, 
    phone,
    full_name,
    account_type,
    user_role,
    status
  )
  VALUES (
    NEW.id, 
    NEW.email,
    CASE WHEN v_phone_exists THEN NULL ELSE v_phone END,
    v_full_name,
    v_account_type::text,
    'user',
    'unverified'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = CASE 
      WHEN v_phone_exists THEN profiles.phone 
      ELSE EXCLUDED.phone 
    END,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    account_type = COALESCE(EXCLUDED.account_type, profiles.account_type),
    updated_at = now();

  -- Process referral if provided
  IF v_referral_code IS NOT NULL AND trim(v_referral_code) != '' THEN
    -- This will be handled by process_referral_signup trigger
    NULL;
  END IF;

  -- Create user wallets
  INSERT INTO public.wallets (user_id, currency, balance, status)
  VALUES 
    (NEW.id, 'UGX', 0, 'active'),
    (NEW.id, 'USD', 0, 'active')
  ON CONFLICT (user_id, currency) DO NOTHING;

  RETURN NEW;
END;
$$;
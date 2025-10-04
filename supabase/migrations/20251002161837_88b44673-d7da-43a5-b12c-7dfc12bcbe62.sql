
-- Fix handle_new_user to properly set auth_created_at and account_activation_status
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
  v_user_role TEXT := 'user';
BEGIN
  -- Extract data from auth metadata
  v_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual');
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';

  -- Set admin role for specific email
  IF NEW.email = 'yawatu256@gmail.com' THEN
    v_user_role := 'admin';
  END IF;

  -- Check if phone already exists on another profile
  IF v_phone IS NOT NULL AND length(trim(v_phone)) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.phone = v_phone AND p.id <> NEW.id
    ) INTO v_phone_exists;
  END IF;

  -- Insert or update profile with all metadata including auth_created_at
  INSERT INTO public.profiles (
    id, 
    email, 
    phone,
    full_name,
    account_type,
    user_role,
    status,
    auth_created_at,
    account_activation_status
  )
  VALUES (
    NEW.id, 
    NEW.email,
    CASE WHEN v_phone_exists THEN NULL ELSE v_phone END,
    v_full_name,
    v_account_type::text,
    v_user_role,
    'unverified',
    now(), -- Set auth_created_at to indicate auth account exists
    'activated' -- Account is activated since they're creating auth themselves
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = CASE 
      WHEN v_phone_exists THEN profiles.phone 
      ELSE EXCLUDED.phone 
    END,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    account_type = COALESCE(EXCLUDED.account_type, profiles.account_type),
    auth_created_at = COALESCE(profiles.auth_created_at, now()),
    account_activation_status = COALESCE(profiles.account_activation_status, 'activated'),
    updated_at = now();

  -- Create user wallets
  INSERT INTO public.wallets (user_id, currency, balance, status)
  VALUES 
    (NEW.id, 'UGX', 0, 'active'),
    (NEW.id, 'USD', 0, 'active')
  ON CONFLICT (user_id, currency) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

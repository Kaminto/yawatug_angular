-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_role TEXT := 'user';
BEGIN
  -- Set admin role for specific email
  IF NEW.email = 'yawatu256@gmail.com' THEN
    new_user_role := 'admin';
  END IF;
  
  -- Insert profile for new user
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    account_type,
    user_role,
    status,
    auth_created_at,
    account_activation_status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual'),
    new_user_role,
    'unverified',
    now(),
    'pending',
    now(),
    now()
  );
  
  -- Create UGX wallet for new user
  INSERT INTO public.wallets (
    user_id,
    currency,
    balance,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'UGX',
    0,
    'active',
    now(),
    now()
  );
  
  -- Create USD wallet for new user
  INSERT INTO public.wallets (
    user_id,
    currency, 
    balance,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'USD',
    0,
    'active',
    now(),
    now()
  );
  
  -- Process referral if referral code was provided
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    BEGIN
      PERFORM public.process_signup_referral(
        NEW.id,
        NEW.raw_user_meta_data->>'referral_code'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the user creation
      RAISE WARNING 'Failed to process referral for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't prevent user creation
  RAISE WARNING 'Failed to create profile/wallets for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically handle new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
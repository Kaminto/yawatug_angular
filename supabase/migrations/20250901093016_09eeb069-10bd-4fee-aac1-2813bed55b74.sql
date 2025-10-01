-- Create function to generate referral codes for users
CREATE OR REPLACE FUNCTION generate_referral_code(user_id UUID, full_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base code from name or use random if name is empty
  IF full_name IS NOT NULL AND LENGTH(TRIM(full_name)) > 0 THEN
    base_code := UPPER(REGEXP_REPLACE(TRIM(full_name), '[^A-Za-z0-9]', '', 'g'));
    base_code := SUBSTRING(base_code, 1, 6) || 'REF';
  ELSE
    base_code := 'USER' || SUBSTR(user_id::TEXT, 1, 4) || 'REF';
  END IF;
  
  -- Make sure code is unique
  final_code := base_code;
  WHILE EXISTS (SELECT 1 FROM referral_codes WHERE code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || counter::TEXT;
  END LOOP;
  
  -- Insert into referral_codes table
  INSERT INTO referral_codes (user_id, code, is_active)
  VALUES (user_id, final_code, true);
  
  -- Update profile with referral code
  UPDATE profiles SET referral_code = final_code WHERE id = user_id;
  
  RETURN final_code;
END;
$$;

-- Generate referral codes for existing users
DO $$
DECLARE
  user_record RECORD;
  generated_code TEXT;
BEGIN
  FOR user_record IN 
    SELECT id, full_name 
    FROM profiles 
    WHERE referral_code IS NULL
  LOOP
    generated_code := generate_referral_code(user_record.id, user_record.full_name);
    RAISE NOTICE 'Generated referral code % for user %', generated_code, user_record.full_name;
  END LOOP;
END;
$$;

-- Create function to handle referral processing during registration
CREATE OR REPLACE FUNCTION process_referral_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_user_id UUID;
  referral_code_used TEXT;
BEGIN
  -- Get referral code from user metadata
  referral_code_used := NEW.raw_user_meta_data->>'referral_code';
  
  IF referral_code_used IS NOT NULL THEN
    -- Find the referrer
    SELECT user_id INTO referrer_user_id 
    FROM referral_codes 
    WHERE code = referral_code_used AND is_active = true;
    
    IF referrer_user_id IS NOT NULL THEN
      -- Update the new user's profile with referrer information
      UPDATE profiles 
      SET referred_by = referrer_user_id 
      WHERE id = NEW.id;
      
      -- Create referral activity record
      INSERT INTO referral_activities (
        referrer_id,
        referred_id,
        activity_type,
        status,
        created_at
      ) VALUES (
        referrer_user_id,
        NEW.id,
        'signup',
        'pending',
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to process referrals on auth user creation
DROP TRIGGER IF EXISTS on_auth_user_referral_processing ON auth.users;
CREATE TRIGGER on_auth_user_referral_processing
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION process_referral_signup();

-- Create function to auto-generate referral codes for new users
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  generated_code TEXT;
BEGIN
  -- Generate referral code if not already set
  IF NEW.referral_code IS NULL THEN
    generated_code := generate_referral_code(NEW.id, NEW.full_name);
    NEW.referral_code := generated_code;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate referral codes for new profiles
DROP TRIGGER IF EXISTS auto_generate_referral_code_trigger ON profiles;
CREATE TRIGGER auto_generate_referral_code_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION auto_generate_referral_code();
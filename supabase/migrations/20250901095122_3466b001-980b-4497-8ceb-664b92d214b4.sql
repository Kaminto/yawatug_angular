-- Update referral code generation to use YWT format based on registration order
CREATE OR REPLACE FUNCTION public.generate_referral_code_yawatu_format(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count INTEGER;
  referral_code TEXT;
BEGIN
  -- Get the count of users created before this user to determine their registration number
  SELECT COUNT(*) INTO user_count
  FROM public.profiles
  WHERE created_at <= (SELECT created_at FROM public.profiles WHERE id = p_user_id);
  
  -- Generate referral code in YWT format
  referral_code := 'YWT' || LPAD(user_count::text, 5, '0');
  
  RETURN referral_code;
END;
$$;

-- Function to update all existing users with YWT format referral codes
CREATE OR REPLACE FUNCTION public.update_all_referral_codes_to_yawatu_format()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  user_position INTEGER := 0;
BEGIN
  -- Update all users with YWT format codes based on their creation order
  FOR user_record IN 
    SELECT id FROM public.profiles 
    ORDER BY created_at ASC
  LOOP
    user_position := user_position + 1;
    
    UPDATE public.profiles 
    SET referral_code = 'YWT' || LPAD(user_position::text, 5, '0')
    WHERE id = user_record.id;
  END LOOP;
END;
$$;

-- Update all existing users to have YWT format referral codes
SELECT public.update_all_referral_codes_to_yawatu_format();

-- Update the auto-generate referral code trigger to use YWT format
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code_yawatu()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.generate_referral_code_yawatu_format(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the old trigger and create new one
DROP TRIGGER IF EXISTS auto_generate_referral_code_trigger ON public.profiles;
CREATE TRIGGER auto_generate_referral_code_yawatu_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_referral_code_yawatu();
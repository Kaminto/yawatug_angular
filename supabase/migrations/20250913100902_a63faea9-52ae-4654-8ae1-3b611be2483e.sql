-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    account_type,
    user_role,
    status,
    referral_code,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    CASE 
      WHEN NEW.raw_user_meta_data->>'registration_method' = 'phone' THEN NULL
      ELSE NEW.email
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual'),
    CASE 
      WHEN NEW.email = 'yawatu256@gmail.com' THEN 'admin'
      ELSE 'user'
    END,
    'unverified',
    public.generate_unique_referral_code(),
    NOW(),
    NOW()
  );

  -- Create default wallets for the user
  INSERT INTO public.wallets (user_id, currency, balance, status, created_at, updated_at)
  VALUES 
    (NEW.id, 'UGX', 0, 'active', NOW(), NOW()),
    (NEW.id, 'USD', 0, 'active', NOW(), NOW());

  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add policy for users to view active bank accounts
CREATE POLICY "Users can view active admin bank accounts" 
ON public.admin_bank_accounts 
FOR SELECT 
USING (is_active = true AND approval_status = 'approved');

-- Ensure proper function exists for referral code generation  
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate code in format YWT + 5 digit number
        new_code := 'YWT' || LPAD((EXTRACT(EPOCH FROM now())::bigint % 100000)::text + counter, 5, '0');
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
        
        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
        
        -- Increment counter and try again
        counter := counter + 1;
        
        -- Prevent infinite loop
        IF counter > 1000 THEN
            new_code := 'YWT' || gen_random_uuid()::text;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_code;
END;
$$;
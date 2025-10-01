-- Create security-related tables for PIN and 2FA settings

-- Create user_pins table for transaction PINs
CREATE TABLE IF NOT EXISTS public.user_pins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id)
);

-- Create two_factor_auth table for 2FA settings  
CREATE TABLE IF NOT EXISTS public.two_factor_auth (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  google_auth_enabled BOOLEAN DEFAULT FALSE,
  google_auth_secret TEXT,
  backup_codes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create biometric_settings table
CREATE TABLE IF NOT EXISTS public.biometric_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  fingerprint_data JSONB,
  face_id_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_factor_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_pins
CREATE POLICY "Users can access their own PIN settings" ON public.user_pins
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for two_factor_auth  
CREATE POLICY "Users can access their own 2FA settings" ON public.two_factor_auth
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for biometric_settings
CREATE POLICY "Users can access their own biometric settings" ON public.biometric_settings
  FOR ALL USING (auth.uid() = user_id);

-- Add missing verification_method column to otp_codes if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_codes' AND column_name = 'verification_method') THEN
        ALTER TABLE public.otp_codes ADD COLUMN verification_method TEXT DEFAULT 'sms';
    END IF;
END $$;

-- Create function to hash PIN
CREATE OR REPLACE FUNCTION public.hash_pin(pin TEXT)
RETURNS TABLE(hash TEXT, salt TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  generated_salt TEXT;
  hashed_pin TEXT;
BEGIN
  generated_salt := encode(gen_random_bytes(32), 'base64');
  hashed_pin := encode(digest(pin || generated_salt, 'sha256'), 'hex');
  RETURN QUERY SELECT hashed_pin, generated_salt;
END;
$$;

-- Create function to verify PIN
CREATE OR REPLACE FUNCTION public.verify_pin(user_id UUID, pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  
AS $$
DECLARE
  stored_hash TEXT;
  stored_salt TEXT;
  calculated_hash TEXT;
BEGIN
  SELECT pin_hash, salt INTO stored_hash, stored_salt
  FROM public.user_pins
  WHERE user_pins.user_id = verify_pin.user_id;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  calculated_hash := encode(digest(pin || stored_salt, 'sha256'), 'hex');
  
  RETURN calculated_hash = stored_hash;
END;
$$;
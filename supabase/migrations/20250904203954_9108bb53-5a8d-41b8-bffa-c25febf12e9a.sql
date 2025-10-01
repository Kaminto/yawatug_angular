-- Check existing RLS policies and create only missing ones

-- First, let's fix the critical get-secrets function security issue
-- We'll address this by requiring JWT verification in the config.toml

-- Create missing RLS policies for OTP codes (only if they don't exist)
DO $$ 
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'otp_codes' 
        AND policyname = 'Users can view their own OTP codes'
    ) THEN
        CREATE POLICY "Users can view their own OTP codes"
        ON public.otp_codes
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sms_rate_limits' 
        AND policyname = 'Users can view their own SMS rate limits'
    ) THEN
        CREATE POLICY "Users can view their own SMS rate limits"
        ON public.sms_rate_limits
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'referral_statistics' 
        AND policyname = 'Users can view their own referral statistics'
    ) THEN
        CREATE POLICY "Users can view their own referral statistics"
        ON public.referral_statistics
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Add rate limiting protection to PIN verification by adding failed attempt tracking
CREATE TABLE IF NOT EXISTS public.pin_verification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    success BOOLEAN DEFAULT false,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.pin_verification_attempts ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for pin verification attempts
CREATE POLICY "Users can view their own PIN attempts"
ON public.pin_verification_attempts
FOR SELECT
USING (auth.uid() = user_id);

-- Create enhanced PIN verification function with rate limiting
CREATE OR REPLACE FUNCTION public.verify_pin_with_rate_limit(p_user_id uuid, p_pin text, p_ip_address inet DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  stored_hash TEXT;
  stored_salt TEXT;
  calculated_hash TEXT;
  recent_failures INTEGER;
  is_valid BOOLEAN := FALSE;
  result JSONB;
BEGIN
  -- Check for too many recent failed attempts (5 failures in last 15 minutes)
  SELECT COUNT(*) INTO recent_failures
  FROM public.pin_verification_attempts
  WHERE user_id = p_user_id 
    AND success = FALSE 
    AND attempt_time > (now() - INTERVAL '15 minutes');
  
  -- Block if too many recent failures
  IF recent_failures >= 5 THEN
    -- Log the blocked attempt
    INSERT INTO public.pin_verification_attempts (user_id, success, ip_address)
    VALUES (p_user_id, FALSE, p_ip_address);
    
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Too many failed attempts. Please try again in 15 minutes.',
      'blocked', TRUE
    );
  END IF;
  
  -- Get stored PIN hash and salt
  SELECT pin_hash, salt INTO stored_hash, stored_salt
  FROM public.user_pins
  WHERE user_pins.user_id = p_user_id;
  
  IF stored_hash IS NULL THEN
    -- Log failed attempt (no PIN set)
    INSERT INTO public.pin_verification_attempts (user_id, success, ip_address)
    VALUES (p_user_id, FALSE, p_ip_address);
    
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No PIN configured',
      'blocked', FALSE
    );
  END IF;
  
  -- Verify PIN
  calculated_hash := encode(digest(p_pin || stored_salt, 'sha256'), 'hex');
  is_valid := (calculated_hash = stored_hash);
  
  -- Log attempt
  INSERT INTO public.pin_verification_attempts (user_id, success, ip_address)
  VALUES (p_user_id, is_valid, p_ip_address);
  
  RETURN jsonb_build_object(
    'success', is_valid,
    'error', CASE WHEN is_valid THEN NULL ELSE 'Invalid PIN' END,
    'blocked', FALSE
  );
END;
$function$;

-- Fix more database functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN (SELECT user_role FROM public.profiles WHERE id = auth.uid());
END;
$function$;

-- Create function to check if user is admin (avoiding RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id AND user_role = 'admin'
  );
END;
$function$;
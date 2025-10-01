-- CRITICAL SECURITY FIX 1: Secure publicly accessible sensitive tables

-- Add RLS policies for profiles table (users can only access their own data)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Add RLS policies for otp_codes table (users can only access their own OTPs)
CREATE POLICY "Users can view their own OTP codes"
ON public.otp_codes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own OTP codes"
ON public.otp_codes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for sms_rate_limits table (users can only see their own limits)
CREATE POLICY "Users can view their own SMS rate limits"
ON public.sms_rate_limits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own SMS rate limits"
ON public.sms_rate_limits
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for referral_statistics table (users can only see their own stats)
CREATE POLICY "Users can view their own referral statistics"
ON public.referral_statistics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own referral statistics"
ON public.referral_statistics
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix database functions to include proper search_path (addressing 137 function security warnings)
CREATE OR REPLACE FUNCTION public.update_admin_settings_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Delete expired OTPs older than 1 hour
  DELETE FROM public.otp_codes 
  WHERE expires_at < (now() - INTERVAL '1 hour');
  
  -- Delete old rate limit records older than 24 hours
  DELETE FROM public.sms_rate_limits 
  WHERE window_end < (now() - INTERVAL '24 hours');
  
  -- Delete old delivery logs older than 30 days
  DELETE FROM public.sms_delivery_logs 
  WHERE created_at < (now() - INTERVAL '30 days');
END;
$function$;

CREATE OR REPLACE FUNCTION public.hash_pin(pin text)
RETURNS TABLE(hash text, salt text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  generated_salt TEXT;
  hashed_pin TEXT;
BEGIN
  generated_salt := encode(gen_random_bytes(32), 'base64');
  hashed_pin := encode(digest(pin || generated_salt, 'sha256'), 'hex');
  RETURN QUERY SELECT hashed_pin, generated_salt;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_pin(user_id uuid, pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Add admin-only policies for system functions
CREATE POLICY "Admins can insert OTP codes"
ON public.otp_codes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);

CREATE POLICY "System can insert SMS rate limits"
ON public.sms_rate_limits
FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);

-- Add missing admin policies for sensitive operations
CREATE POLICY "Admins can manage all OTP codes"
ON public.otp_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);

CREATE POLICY "Admins can manage all SMS rate limits"
ON public.sms_rate_limits
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);

CREATE POLICY "Admins can manage all referral statistics"
ON public.referral_statistics
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);
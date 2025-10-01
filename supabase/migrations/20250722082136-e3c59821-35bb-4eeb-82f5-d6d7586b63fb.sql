
-- Enhanced SMS OTP system with comprehensive tracking and rate limiting

-- Drop existing table to recreate with enhanced schema
DROP TABLE IF EXISTS public.otp_codes CASCADE;

-- Create enhanced OTP codes table
CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('wallet_transaction', 'two_factor_auth', 'verification', 'password_reset')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Enhanced tracking fields
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_until TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  
  -- SMS delivery tracking
  sms_status TEXT DEFAULT 'pending' CHECK (sms_status IN ('pending', 'sent', 'delivered', 'failed')),
  sms_provider_response JSONB,
  sms_sent_at TIMESTAMP WITH TIME ZONE,
  delivery_attempts INTEGER NOT NULL DEFAULT 0
);

-- Create SMS rate limiting table
CREATE TABLE public.sms_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  phone_number TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts_count INTEGER NOT NULL DEFAULT 1,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SMS delivery logs table
CREATE TABLE public.sms_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  otp_id UUID REFERENCES public.otp_codes(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  provider_name TEXT NOT NULL DEFAULT 'easyuganda',
  provider_response JSONB,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'failed', 'expired')),
  cost_amount NUMERIC(10,4),
  cost_currency TEXT DEFAULT 'UGX',
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SMS configuration table
CREATE TABLE public.sms_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;

-- Create policies for OTP codes
CREATE POLICY "System can manage OTP codes" 
  ON public.otp_codes FOR ALL 
  USING (true) WITH CHECK (true);

-- Create policies for SMS rate limits
CREATE POLICY "System can manage SMS rate limits" 
  ON public.sms_rate_limits FOR ALL 
  USING (true) WITH CHECK (true);

-- Create policies for SMS delivery logs
CREATE POLICY "System can manage SMS delivery logs" 
  ON public.sms_delivery_logs FOR ALL 
  USING (true) WITH CHECK (true);

-- Create policies for SMS config
CREATE POLICY "Admins can manage SMS config" 
  ON public.sms_config FOR ALL 
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view SMS config" 
  ON public.sms_config FOR SELECT 
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_otp_codes_phone_purpose ON public.otp_codes(phone_number, purpose);
CREATE INDEX idx_otp_codes_expires_at ON public.otp_codes(expires_at);
CREATE INDEX idx_otp_codes_user_id ON public.otp_codes(user_id);
CREATE INDEX idx_otp_codes_status ON public.otp_codes(sms_status);

CREATE INDEX idx_sms_rate_limits_user_phone ON public.sms_rate_limits(user_id, phone_number);
CREATE INDEX idx_sms_rate_limits_window ON public.sms_rate_limits(window_start, window_end);

CREATE INDEX idx_sms_delivery_logs_otp_id ON public.sms_delivery_logs(otp_id);
CREATE INDEX idx_sms_delivery_logs_status ON public.sms_delivery_logs(status);
CREATE INDEX idx_sms_delivery_logs_phone ON public.sms_delivery_logs(phone_number);

-- Insert default SMS configuration
INSERT INTO public.sms_config (config_key, config_value, description) VALUES
('rate_limits', '{"per_user_per_10min": 3, "per_phone_per_hour": 5, "per_user_per_day": 10}', 'SMS rate limiting configuration'),
('otp_settings', '{"length": 6, "expiry_minutes": 10, "max_attempts": 3, "block_duration_minutes": 30}', 'OTP generation and validation settings'),
('message_templates', '{"wallet_transaction": "YAWATU OTP: {otp}. Use this to confirm your {transaction_type} of UGX {amount}. Valid for {expiry_minutes} minutes.", "two_factor_auth": "YAWATU OTP: {otp}. Use this to complete your login. Valid for {expiry_minutes} minutes.", "verification": "YAWATU OTP: {otp}. Use this to verify your phone number. Valid for {expiry_minutes} minutes."}', 'SMS message templates'),
('provider_settings', '{"primary": "easyuganda", "failover_enabled": true, "retry_attempts": 2, "timeout_seconds": 30}', 'SMS provider configuration');

-- Create function to clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create function to check SMS rate limits
CREATE OR REPLACE FUNCTION check_sms_rate_limit(p_user_id UUID, p_phone_number TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_window_start TIMESTAMP WITH TIME ZONE;
  current_window_end TIMESTAMP WITH TIME ZONE;
  current_attempts INTEGER;
  max_attempts INTEGER := 3;
BEGIN
  -- Define 10-minute window
  current_window_start := date_trunc('minute', now()) - (EXTRACT(minute FROM now())::INTEGER % 10) * INTERVAL '1 minute';
  current_window_end := current_window_start + INTERVAL '10 minutes';
  
  -- Check existing rate limit record
  SELECT attempts_count INTO current_attempts
  FROM public.sms_rate_limits
  WHERE user_id = p_user_id 
    AND phone_number = p_phone_number
    AND window_start = current_window_start;
  
  IF current_attempts IS NULL THEN
    -- Create new rate limit record
    INSERT INTO public.sms_rate_limits (user_id, phone_number, window_start, window_end, attempts_count, max_attempts)
    VALUES (p_user_id, p_phone_number, current_window_start, current_window_end, 1, max_attempts);
    RETURN TRUE;
  ELSIF current_attempts < max_attempts THEN
    -- Update existing record
    UPDATE public.sms_rate_limits 
    SET attempts_count = attempts_count + 1, updated_at = now()
    WHERE user_id = p_user_id 
      AND phone_number = p_phone_number
      AND window_start = current_window_start;
    RETURN TRUE;
  ELSE
    -- Rate limit exceeded
    RETURN FALSE;
  END IF;
END;
$$;

-- Create function to update SMS delivery status
CREATE OR REPLACE FUNCTION update_sms_delivery_status(p_otp_id UUID, p_status TEXT, p_provider_response JSONB DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update OTP record
  UPDATE public.otp_codes 
  SET sms_status = p_status,
      sms_provider_response = p_provider_response,
      sms_sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE sms_sent_at END
  WHERE id = p_otp_id;
  
  -- Update delivery log
  UPDATE public.sms_delivery_logs 
  SET status = p_status,
      provider_response = p_provider_response,
      sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE sent_at END,
      delivered_at = CASE WHEN p_status = 'delivered' THEN now() ELSE delivered_at END,
      failed_at = CASE WHEN p_status = 'failed' THEN now() ELSE failed_at END,
      updated_at = now()
  WHERE otp_id = p_otp_id;
END;
$$;

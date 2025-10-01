
-- Create OTP codes table for SMS verification
CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Create policy for OTP codes - only the system should manage these
CREATE POLICY "System can manage OTP codes" 
  ON public.otp_codes 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Add index for performance
CREATE INDEX idx_otp_codes_phone_purpose ON public.otp_codes(phone_number, purpose);
CREATE INDEX idx_otp_codes_expires_at ON public.otp_codes(expires_at);

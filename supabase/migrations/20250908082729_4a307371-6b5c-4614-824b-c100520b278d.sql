-- Add missing fields to otp_codes table
ALTER TABLE public.otp_codes 
ADD COLUMN IF NOT EXISTS verification_method text DEFAULT 'sms';

ALTER TABLE public.otp_codes 
ADD COLUMN IF NOT EXISTS is_used boolean DEFAULT false;

ALTER TABLE public.otp_codes 
ADD COLUMN IF NOT EXISTS used_at timestamp with time zone;
-- Add missing columns to otp_codes table for proper verification
ALTER TABLE public.otp_codes 
ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 3;
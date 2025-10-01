-- Align otp_codes schema with edge function expectations
ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;
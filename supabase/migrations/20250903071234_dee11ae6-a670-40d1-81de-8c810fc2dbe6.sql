-- Create two_factor_auth table for storing user 2FA settings
CREATE TABLE public.two_factor_auth (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  google_auth_enabled BOOLEAN NOT NULL DEFAULT false,
  google_auth_secret TEXT,
  backup_codes JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.two_factor_auth ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own 2FA settings" 
ON public.two_factor_auth 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_two_factor_auth_user_id ON public.two_factor_auth(user_id);
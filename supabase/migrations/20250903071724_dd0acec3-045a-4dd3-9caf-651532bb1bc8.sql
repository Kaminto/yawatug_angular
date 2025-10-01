-- Fix two_factor_auth table structure
-- Add missing constraints and fix nullable columns

-- First make user_id NOT NULL
ALTER TABLE public.two_factor_auth 
ALTER COLUMN user_id SET NOT NULL;

-- Set default values for boolean columns and make them NOT NULL
UPDATE public.two_factor_auth SET sms_enabled = false WHERE sms_enabled IS NULL;
ALTER TABLE public.two_factor_auth 
ALTER COLUMN sms_enabled SET DEFAULT false,
ALTER COLUMN sms_enabled SET NOT NULL;

UPDATE public.two_factor_auth SET google_auth_enabled = false WHERE google_auth_enabled IS NULL;
ALTER TABLE public.two_factor_auth 
ALTER COLUMN google_auth_enabled SET DEFAULT false,
ALTER COLUMN google_auth_enabled SET NOT NULL;

-- Set default values for timestamp columns and make them NOT NULL
UPDATE public.two_factor_auth SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.two_factor_auth 
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN created_at SET NOT NULL;

UPDATE public.two_factor_auth SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.two_factor_auth 
ALTER COLUMN updated_at SET DEFAULT now(),
ALTER COLUMN updated_at SET NOT NULL;

-- Add the unique constraint on user_id
ALTER TABLE public.two_factor_auth 
ADD CONSTRAINT two_factor_auth_user_id_unique UNIQUE (user_id);

-- Add foreign key constraint if not exists
ALTER TABLE public.two_factor_auth 
ADD CONSTRAINT two_factor_auth_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
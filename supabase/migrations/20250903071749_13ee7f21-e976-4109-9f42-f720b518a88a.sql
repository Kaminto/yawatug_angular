-- Clean up duplicate records and fix table structure

-- Delete duplicate records, keeping only the most recent one for each user_id
DELETE FROM public.two_factor_auth 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM public.two_factor_auth 
    ORDER BY user_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Now fix the table structure
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

-- Add foreign key constraint
ALTER TABLE public.two_factor_auth 
ADD CONSTRAINT two_factor_auth_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
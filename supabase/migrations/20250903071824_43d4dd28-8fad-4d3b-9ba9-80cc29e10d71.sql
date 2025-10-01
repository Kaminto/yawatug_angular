-- Clean up duplicates and add unique constraint only

-- Delete duplicate records, keeping only the most recent one for each user_id
DELETE FROM public.two_factor_auth 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM public.two_factor_auth 
    ORDER BY user_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Fix column defaults and constraints
UPDATE public.two_factor_auth SET sms_enabled = false WHERE sms_enabled IS NULL;
UPDATE public.two_factor_auth SET google_auth_enabled = false WHERE google_auth_enabled IS NULL;
UPDATE public.two_factor_auth SET created_at = now() WHERE created_at IS NULL;
UPDATE public.two_factor_auth SET updated_at = now() WHERE updated_at IS NULL;

ALTER TABLE public.two_factor_auth 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN sms_enabled SET DEFAULT false,
ALTER COLUMN sms_enabled SET NOT NULL,
ALTER COLUMN google_auth_enabled SET DEFAULT false,
ALTER COLUMN google_auth_enabled SET NOT NULL,
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET DEFAULT now(),
ALTER COLUMN updated_at SET NOT NULL;

-- Add the unique constraint on user_id
ALTER TABLE public.two_factor_auth 
ADD CONSTRAINT two_factor_auth_user_id_unique UNIQUE (user_id);
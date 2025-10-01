
-- 1. Add `account_type` column if missing (use existing enum or text—based on code, this is likely: 'individual', 'organisation', 'business', 'minor', 'admin', etc)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='account_type') THEN
        ALTER TABLE public.profiles ADD COLUMN account_type text;
    END IF;
END $$;

-- 2. Add `user_role` column if missing (use text: 'admin', 'user', etc)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='user_role') THEN
        ALTER TABLE public.profiles ADD COLUMN user_role text;
    END IF;
END $$;

-- 3. Migrate account type data from `user_type` to `account_type` if needed
UPDATE public.profiles SET account_type = user_type WHERE user_type IS NOT NULL AND (account_type IS NULL OR account_type = '');

-- 4. Default all `user_role` column to 'user' if empty
UPDATE public.profiles SET user_role = 'user' WHERE user_role IS NULL OR user_role = '';

-- 5. Optional: if NOT needed anymore, set user_type to NULL to deprecate it (but don't drop column without manual data migration)
-- UPDATE public.profiles SET user_type = NULL;

-- 6. Optionally set NOT NULL (uncomment to enforce)
-- ALTER TABLE public.profiles ALTER COLUMN account_type SET NOT NULL;
-- ALTER TABLE public.profiles ALTER COLUMN user_role SET NOT NULL;

-- 7. Ensure the correct types (optional: consider future conversion to enum)

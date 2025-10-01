
-- First, drop the unique constraint on account_type
ALTER TABLE public.share_buying_limits 
DROP CONSTRAINT IF EXISTS share_buying_limits_account_type_key;

-- Now update any existing rows to use standardized account types
-- Since we removed the unique constraint, we need to handle potential duplicates
DELETE FROM public.share_buying_limits 
WHERE account_type NOT IN ('individual', 'organisation', 'business');

-- Update profiles table to be consistent
UPDATE public.profiles 
SET account_type = CASE 
    WHEN account_type = 'minor' THEN 'individual'
    WHEN account_type = 'admin' THEN 'individual'
    WHEN account_type NOT IN ('individual', 'organisation', 'business') THEN 'individual'
    ELSE account_type
END
WHERE account_type IS NOT NULL;

-- Drop and recreate the check constraints with correct values
ALTER TABLE public.share_buying_limits 
DROP CONSTRAINT IF EXISTS share_buying_limits_account_type_check;

ALTER TABLE public.share_buying_limits 
ADD CONSTRAINT share_buying_limits_account_type_check 
CHECK (account_type IN ('individual', 'organisation', 'business'));

ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_account_type_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_account_type_check 
CHECK (account_type IN ('individual', 'organisation', 'business'));

-- Recreate the unique constraint on account_type for share_buying_limits
ALTER TABLE public.share_buying_limits 
ADD CONSTRAINT share_buying_limits_account_type_key UNIQUE (account_type);

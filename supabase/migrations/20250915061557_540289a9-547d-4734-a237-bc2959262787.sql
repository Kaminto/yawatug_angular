-- Sequential referral code generation and trigger
-- Ensures unique, incrementing codes like YWT00001, YWT00002...

-- 1) Function to generate the next referral code safely
CREATE OR REPLACE FUNCTION public.generate_next_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number integer;
BEGIN
  -- Prevent race conditions in concurrent signups
  PERFORM pg_advisory_xact_lock(98123456);

  -- Find highest existing numeric suffix and increment
  SELECT COALESCE(MAX((substring(referral_code from 4)::int)), 0)
  INTO next_number
  FROM public.profiles
  WHERE referral_code ~ '^YWT[0-9]{5}$';

  next_number := next_number + 1; -- start at 1 if none exists

  RETURN 'YWT' || lpad(next_number::text, 5, '0');
END;
$$;

-- 2) BEFORE INSERT trigger function to set referral_code when missing/invalid
CREATE OR REPLACE FUNCTION public.set_referral_code_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL
     OR NEW.referral_code = ''
     OR NEW.referral_code !~ '^YWT[0-9]{5}$' THEN
    NEW.referral_code := public.generate_next_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Ensure trigger exists (recreate if already present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_profiles_set_referral_code'
  ) THEN
    DROP TRIGGER trg_profiles_set_referral_code ON public.profiles;
  END IF;
END$$;

CREATE TRIGGER trg_profiles_set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_referral_code_on_insert();

-- 4) Keep backward compatibility: map existing generator to the new one
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.generate_next_referral_code();
END;
$$;
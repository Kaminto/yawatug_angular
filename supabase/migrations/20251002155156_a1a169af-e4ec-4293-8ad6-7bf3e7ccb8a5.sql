-- Fix: Drop old function signature first, then recreate with correct references
-- Drop the old function with the exact original signature
DROP FUNCTION IF EXISTS public.generate_referral_code(uuid, text);

-- Recreate with proper naming using p_ prefix
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid, p_full_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proposed_code text;
  attempt int := 0;
BEGIN
  -- Prefer existing generator if available
  LOOP
    attempt := attempt + 1;
    IF attempt = 1 THEN
      -- Use Yawatu code generator if present
      BEGIN
        proposed_code := public.generate_next_referral_code();
      EXCEPTION WHEN undefined_function THEN
        proposed_code := 'YWT' || lpad((EXTRACT(EPOCH FROM now())::bigint % 100000)::text, 5, '0');
      END;
    ELSE
      -- add suffix to avoid rare collision
      proposed_code := proposed_code || '_' || attempt::text;
    END IF;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = proposed_code
    );
  END LOOP;

  UPDATE public.profiles
  SET referral_code = proposed_code,
      updated_at = now()
  WHERE id = p_user_id;

  RETURN proposed_code;
END;
$$;

-- 1) Ensure unique index on profiles.referral_code (nullable-safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_profiles_referral_code_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_profiles_referral_code_unique ON public.profiles (referral_code) WHERE referral_code IS NOT NULL';
  END IF;
END$$;

-- 2) Replace auto_generate_referral_code trigger function
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.generate_referral_code(NEW.id, NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS auto_generate_referral_code_trigger ON public.profiles;
CREATE TRIGGER auto_generate_referral_code_trigger 
BEFORE INSERT ON public.profiles 
FOR EACH ROW EXECUTE FUNCTION public.auto_generate_referral_code();

-- 3) Replace process_referral_signup to use profiles instead of referral_codes
CREATE OR REPLACE FUNCTION public.process_referral_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id uuid;
  referral_code_used text;
BEGIN
  referral_code_used := NEW.raw_user_meta_data->>'referral_code';

  IF referral_code_used IS NULL OR referral_code_used = '' THEN
    RETURN NEW;
  END IF;

  -- Find referrer by code in profiles (avoid self-referral)
  SELECT id INTO referrer_id
  FROM public.profiles
  WHERE referral_code = referral_code_used
    AND id <> NEW.id
  LIMIT 1;

  IF referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Attach referrer to profile if it exists already
  UPDATE public.profiles 
  SET referred_by = referrer_id,
      updated_at = now()
  WHERE id = NEW.id;

  -- Log referral activity
  INSERT INTO public.referral_activities (referrer_id, referred_id, activity_type, created_at)
  VALUES (referrer_id, NEW.id, 'signup', now());

  RETURN NEW;
END;
$$;

-- Recreate the auth trigger
DROP TRIGGER IF EXISTS on_auth_user_referral_processing ON auth.users;
CREATE TRIGGER on_auth_user_referral_processing 
AFTER INSERT ON auth.users 
FOR EACH ROW EXECUTE FUNCTION public.process_referral_signup();
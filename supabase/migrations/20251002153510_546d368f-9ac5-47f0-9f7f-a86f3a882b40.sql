-- Safeguard profiles insert on signup to avoid phone unique violations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_phone TEXT;
  v_phone_exists BOOLEAN := FALSE;
BEGIN
  -- Extract phone from auth table or raw metadata
  v_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');

  -- Insert base profile if not exists (id + email only)
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  -- If phone present, only set it when it's unique
  IF v_phone IS NOT NULL AND length(trim(v_phone)) > 0 THEN
    SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.phone = v_phone AND p.id <> NEW.id) INTO v_phone_exists;

    IF NOT v_phone_exists THEN
      UPDATE public.profiles
      SET phone = v_phone,
          updated_at = now()
      WHERE id = NEW.id;
    END IF;
    -- If it exists on another profile, skip setting phone to avoid unique constraint failure
  END IF;

  -- You can enrich other non-unique fields here from NEW.raw_user_meta_data as needed safely
  RETURN NEW;
END;
$function$;

-- Note: Existing trigger (on_auth_user_created) will continue using this updated function.
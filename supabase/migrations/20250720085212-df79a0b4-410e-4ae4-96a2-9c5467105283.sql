
-- Create a public database function to check user status
-- This function uses SECURITY DEFINER to bypass RLS and check user existence
CREATE OR REPLACE FUNCTION public.check_user_status_public(
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  result jsonb;
BEGIN
  -- Check if user exists by email or phone
  IF p_email IS NOT NULL THEN
    SELECT * INTO user_record
    FROM public.profiles
    WHERE email = p_email
    LIMIT 1;
  ELSIF p_phone IS NOT NULL THEN
    SELECT * INTO user_record
    FROM public.profiles  
    WHERE phone = p_phone
    LIMIT 1;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Either email or phone must be provided'
    );
  END IF;

  -- If no user found
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'exists', false,
      'needs_activation', false
    );
  END IF;

  -- User exists, check if they need activation
  -- Users need activation if they have account_activation_status = 'pending' or 'invited'
  -- and don't have auth_created_at set (meaning no auth account created)
  IF (user_record.account_activation_status IN ('pending', 'invited') 
      AND user_record.auth_created_at IS NULL) THEN
    RETURN jsonb_build_object(
      'success', true,
      'exists', true,
      'needs_activation', true,
      'profile', jsonb_build_object(
        'id', user_record.id,
        'email', user_record.email,
        'full_name', user_record.full_name,
        'phone', user_record.phone
      )
    );
  ELSE
    -- User exists and has been activated
    RETURN jsonb_build_object(
      'success', true,
      'exists', true,
      'needs_activation', false,
      'profile', jsonb_build_object(
        'id', user_record.id,
        'email', user_record.email,
        'full_name', user_record.full_name,
        'phone', user_record.phone
      )
    );
  END IF;
END;
$$;

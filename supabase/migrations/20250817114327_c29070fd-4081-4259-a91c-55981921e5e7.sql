-- Drop and recreate the verify_recipient_lookup function with correct return types
DROP FUNCTION IF EXISTS verify_recipient_lookup(text, text);

CREATE OR REPLACE FUNCTION verify_recipient_lookup(
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT,
  user_exists BOOLEAN,
  verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the parameters for debugging
  RAISE LOG 'verify_recipient_lookup called with email: %, phone: %', p_email, p_phone;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.status::TEXT,  -- Cast status enum to text to avoid type mismatch
    TRUE as user_exists,
    CASE 
      WHEN p.status IN ('active', 'pending', 'unverified') THEN TRUE
      ELSE FALSE
    END as verified
  FROM profiles p
  WHERE 
    (p_email IS NOT NULL AND LOWER(p.email) = LOWER(p_email))
    OR 
    (p_phone IS NOT NULL AND p.phone = p_phone)
  LIMIT 1;
  
  -- If no results found, log it
  IF NOT FOUND THEN
    RAISE LOG 'No recipient found for email: %, phone: %', p_email, p_phone;
  END IF;
END;
$$;
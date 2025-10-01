-- Create the verify_recipient_lookup function that's being called by verify-recipient edge function
CREATE OR REPLACE FUNCTION public.verify_recipient_lookup(p_email text DEFAULT NULL, p_phone text DEFAULT NULL)
RETURNS TABLE(
  user_exists boolean,
  user_id uuid,
  full_name text,
  email text,
  phone text,
  status text,
  verified boolean,
  wallet_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN p.id IS NOT NULL THEN true ELSE false END as user_exists,
    p.id as user_id,
    p.full_name,
    p.email,
    p.phone,
    p.status,
    CASE WHEN p.status IN ('active', 'pending_verification') THEN true ELSE false END as verified,
    w.id as wallet_id
  FROM public.profiles p
  LEFT JOIN public.wallets w ON w.user_id = p.id
  WHERE (p_email IS NOT NULL AND p.email = p_email)
     OR (p_phone IS NOT NULL AND p.phone = p_phone)
  LIMIT 1;
END;
$$;
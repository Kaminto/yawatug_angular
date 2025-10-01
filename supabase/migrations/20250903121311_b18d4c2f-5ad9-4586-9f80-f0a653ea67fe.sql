-- Create or replace the verify_recipient_lookup_with_wallet function with correct return types
CREATE OR REPLACE FUNCTION public.verify_recipient_lookup_with_wallet(
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  full_name text,
  email text,
  phone text,
  status text,
  user_exists boolean,
  verified boolean,
  has_wallet boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.status::text, -- Cast enum to text to match return type
    true as user_exists,
    CASE 
      WHEN p.status IN ('active', 'unverified', 'pending_verification') THEN true
      ELSE false
    END as verified,
    CASE 
      WHEN w.id IS NOT NULL THEN true
      ELSE false
    END as has_wallet
  FROM public.profiles p
  LEFT JOIN public.wallets w ON w.user_id = p.id
  WHERE (p_email IS NOT NULL AND p.email = p_email)
     OR (p_phone IS NOT NULL AND p.phone = p_phone)
  LIMIT 1;
END;
$$;
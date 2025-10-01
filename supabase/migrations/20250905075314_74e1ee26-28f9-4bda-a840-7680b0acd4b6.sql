-- Create the verify_recipient_lookup_with_wallet function for recipient verification
CREATE OR REPLACE FUNCTION public.verify_recipient_lookup_with_wallet(
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
) RETURNS TABLE (
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
    p.status,
    TRUE as user_exists,
    (p.status IN ('active', 'pending_verification')) as verified,
    EXISTS(SELECT 1 FROM public.wallets w WHERE w.user_id = p.id) as has_wallet
  FROM public.profiles p
  WHERE (p_email IS NOT NULL AND p.email = p_email) 
     OR (p_phone IS NOT NULL AND p.phone = p_phone);
END;
$$;
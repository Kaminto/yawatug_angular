-- Create enhanced recipient lookup function with wallet verification
CREATE OR REPLACE FUNCTION verify_recipient_lookup_with_wallet(
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_currency TEXT DEFAULT 'UGX'
) RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT,
  user_exists BOOLEAN,
  verified BOOLEAN,
  has_wallet BOOLEAN,
  wallet_id UUID
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
    CASE 
      WHEN p.status IN ('active', 'unverified', 'pending_verification') THEN TRUE
      ELSE FALSE
    END as verified,
    CASE 
      WHEN w.id IS NOT NULL THEN TRUE
      ELSE FALSE
    END as has_wallet,
    w.id as wallet_id
  FROM public.profiles p
  LEFT JOIN public.wallets w ON p.id = w.user_id AND w.currency = p_currency
  WHERE 
    (p_email IS NOT NULL AND p.email = p_email) OR
    (p_phone IS NOT NULL AND p.phone = p_phone)
  ORDER BY p.created_at DESC
  LIMIT 1;
END;
$$;
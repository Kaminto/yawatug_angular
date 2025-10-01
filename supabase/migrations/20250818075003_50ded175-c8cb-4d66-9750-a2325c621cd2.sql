-- Create functions to find duplicate emails and phones
CREATE OR REPLACE FUNCTION find_duplicate_emails()
RETURNS TABLE(email text, user_count bigint, user_ids uuid[]) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.email::text,
    COUNT(*)::bigint as user_count,
    ARRAY_AGG(p.id) as user_ids
  FROM profiles p
  WHERE p.email IS NOT NULL
  GROUP BY p.email
  HAVING COUNT(*) > 1;
END;
$$;

CREATE OR REPLACE FUNCTION find_duplicate_phones()
RETURNS TABLE(phone text, user_count bigint, user_ids uuid[]) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.phone::text,
    COUNT(*)::bigint as user_count,
    ARRAY_AGG(p.id) as user_ids
  FROM profiles p
  WHERE p.phone IS NOT NULL
  GROUP BY p.phone
  HAVING COUNT(*) > 1;
END;
$$;
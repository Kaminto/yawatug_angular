-- Fix existing referral data by manually assigning users who should have been referred by Nandudu
-- This is based on the assumption that users who signed up recently without referrals 
-- might have used the old YWT00000 code when it belonged to Nandudu

-- Let's create a temporary function to help identify and fix missing referral links
CREATE OR REPLACE FUNCTION fix_missing_referrals()
RETURNS TABLE(user_id UUID, user_name TEXT, action TEXT) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Return information about what would be fixed
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    'would_assign_to_nandudu'::TEXT
  FROM profiles p 
  WHERE p.referred_by IS NULL 
    AND p.created_at > '2025-01-01'
    AND p.id != 'ad067047-71cd-4662-91ff-10dc67cc5d5f' -- Not Nandudu herself
  ORDER BY p.created_at DESC;
END;
$$;

-- Check what users would be affected
SELECT * FROM fix_missing_referrals();
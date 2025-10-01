-- Add unique constraint on phone field to prevent duplicate phone numbers
-- This is critical since phone numbers can be used for login

-- First, identify and handle any existing duplicates
-- We'll keep the oldest account and mark newer ones for manual review
DO $$
DECLARE
  duplicate_record RECORD;
BEGIN
  -- Find duplicate phone numbers
  FOR duplicate_record IN 
    SELECT phone, array_agg(id ORDER BY created_at) as user_ids
    FROM profiles
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone
    HAVING COUNT(*) > 1
  LOOP
    -- Add a suffix to duplicate phone numbers (keep the first one intact)
    FOR i IN 2..array_length(duplicate_record.user_ids, 1) LOOP
      UPDATE profiles 
      SET phone = duplicate_record.phone || '_duplicate_' || i,
          updated_at = now()
      WHERE id = duplicate_record.user_ids[i];
      
      RAISE NOTICE 'Marked duplicate phone % for user ID %', duplicate_record.phone, duplicate_record.user_ids[i];
    END LOOP;
  END LOOP;
END $$;

-- Now add the unique constraint
ALTER TABLE profiles 
ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);

-- Create index for faster phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;

-- Add comment for documentation
COMMENT ON CONSTRAINT profiles_phone_unique ON profiles IS 
'Ensures phone number uniqueness since phone numbers can be used for login. Added for security and data integrity.';
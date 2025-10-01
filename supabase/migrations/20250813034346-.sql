-- Fix foreign key constraint issues and improve club share flow

-- First, safely delete orphaned release log entries that reference non-existent holding accounts
DELETE FROM club_share_release_log 
WHERE club_holding_account_id NOT IN (
  SELECT id FROM club_share_holding_account
);

-- Add user_id to club member records by linking to profiles where email matches
UPDATE investment_club_members 
SET user_id = p.id 
FROM profiles p 
WHERE investment_club_members.email = p.email 
AND investment_club_members.user_id IS NULL;

-- Remove the strict approval workflow - make allocations automatically accepted on import
-- Update existing pending allocations to accepted
UPDATE club_share_allocations 
SET allocation_status = 'accepted',
    consent_signed_at = now()
WHERE allocation_status = 'pending';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_club_share_allocations_batch_ref 
ON club_share_allocations(import_batch_reference);

CREATE INDEX IF NOT EXISTS idx_club_holding_account_allocation_id 
ON club_share_holding_account(club_allocation_id);

CREATE INDEX IF NOT EXISTS idx_investment_club_members_email 
ON investment_club_members(email);

-- Add a function to automatically create user profiles for club members without accounts
CREATE OR REPLACE FUNCTION create_club_member_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if user doesn't exist and we have email
  IF NEW.email IS NOT NULL AND NEW.user_id IS NULL THEN
    -- Check if profile with this email already exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = NEW.email) THEN
      -- Create a basic profile
      INSERT INTO profiles (
        email,
        full_name,
        phone,
        account_type,
        user_role,
        status,
        account_activation_status
      ) VALUES (
        NEW.email,
        NEW.member_name,
        NEW.phone,
        'individual',
        'user',
        'pending_verification',
        'pending'
      ) ON CONFLICT (email) DO NOTHING;
    END IF;
    
    -- Link the club member to the profile
    UPDATE investment_club_members 
    SET user_id = (SELECT id FROM profiles WHERE email = NEW.email LIMIT 1)
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS trigger_create_club_member_profile ON investment_club_members;
CREATE TRIGGER trigger_create_club_member_profile
  AFTER INSERT ON investment_club_members
  FOR EACH ROW EXECUTE FUNCTION create_club_member_profile();
-- First, let's just update existing invitations and fix the validation
-- Update existing pending invitations to sent status (if constraint allows)
UPDATE club_share_consent_invitations 
SET sent_at = COALESCE(sent_at, now())
WHERE status = 'pending';

-- Test if we can update a single record first
UPDATE club_share_consent_invitations 
SET status = 'pending'  -- Keep as pending since that seems to be allowed
WHERE id = (SELECT id FROM club_share_consent_invitations LIMIT 1);
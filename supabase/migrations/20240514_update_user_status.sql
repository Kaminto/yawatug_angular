
-- Add pending_verification as a valid user status type
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'pending_verification';

-- Fix transaction_fee_settings table by adding missing is_active column
ALTER TABLE transaction_fee_settings 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Fix promotional_campaigns table column name issue  
ALTER TABLE promotional_campaigns 
RENAME COLUMN start_date TO starts_at;

ALTER TABLE promotional_campaigns 
RENAME COLUMN end_date TO ends_at;

-- Add foreign key relationship between transactions and profiles
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);

-- Update existing transactions to link with profiles if possible
UPDATE transactions 
SET user_id = (
    SELECT p.id 
    FROM profiles p 
    WHERE p.email = transactions.user_email
) 
WHERE user_id IS NULL AND user_email IS NOT NULL;
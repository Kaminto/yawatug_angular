-- Set default account_type for users who don't have one
UPDATE profiles 
SET account_type = 'individual' 
WHERE account_type IS NULL;
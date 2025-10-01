-- Add RLS policies for remaining referral tables with correct column names
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for referral_codes using correct columns
DROP POLICY IF EXISTS "Users can view their own referral codes" ON referral_codes;
DROP POLICY IF EXISTS "Anyone can view active referral codes" ON referral_codes;

CREATE POLICY "Users can view their own referral codes" 
ON referral_codes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active referral codes" 
ON referral_codes FOR SELECT 
USING (is_active = true);

-- Drop and recreate policies for referral_programs using correct columns  
DROP POLICY IF EXISTS "Anyone can view active referral programs" ON referral_programs;

CREATE POLICY "Anyone can view active referral programs" 
ON referral_programs FOR SELECT 
USING (is_active = true);

-- Test the referral system by checking current data
SELECT COUNT(*) as total_referral_earnings FROM referral_earnings;
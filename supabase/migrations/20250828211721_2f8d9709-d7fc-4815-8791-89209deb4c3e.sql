-- Create RLS policies for referral tables to ensure data visibility

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own referral earnings" ON referral_earnings;
DROP POLICY IF EXISTS "Admins can view all referral earnings" ON referral_earnings;
DROP POLICY IF EXISTS "Users can view their own referral activities" ON referral_activities;
DROP POLICY IF EXISTS "Admins can view all referral activities" ON referral_activities;
DROP POLICY IF EXISTS "Users can view their own referral statistics" ON referral_statistics;
DROP POLICY IF EXISTS "Admins can view all referral statistics" ON referral_statistics;
DROP POLICY IF EXISTS "Users can view their own referral codes" ON referral_codes;
DROP POLICY IF EXISTS "Anyone can view active referral codes for signup" ON referral_codes;
DROP POLICY IF EXISTS "Anyone can view active referral programs" ON referral_programs;

-- Enable RLS on all referral tables
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_campaigns ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies for referral_earnings
CREATE POLICY "Users can view their own referral earnings" 
ON referral_earnings FOR SELECT 
USING (auth.uid() = referrer_id);

CREATE POLICY "Admins can view all referral earnings" 
ON referral_earnings FOR SELECT 
USING (is_admin(auth.uid()));

-- Create new RLS policies for referral_activities  
CREATE POLICY "Users can view their own referral activities" 
ON referral_activities FOR SELECT 
USING (auth.uid() = referrer_id);

CREATE POLICY "Admins can view all referral activities" 
ON referral_activities FOR SELECT 
USING (is_admin(auth.uid()));

-- Create new RLS policies for referral_statistics
CREATE POLICY "Users can view their own referral statistics" 
ON referral_statistics FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all referral statistics" 
ON referral_statistics FOR SELECT 
USING (is_admin(auth.uid()));

-- Create new RLS policies for referral_codes
CREATE POLICY "Users can view their own referral codes" 
ON referral_codes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active referral codes for signup" 
ON referral_codes FOR SELECT 
USING (status = 'active');

-- Create new RLS policies for referral_programs
CREATE POLICY "Anyone can view active referral programs" 
ON referral_programs FOR SELECT 
USING (is_active = true);
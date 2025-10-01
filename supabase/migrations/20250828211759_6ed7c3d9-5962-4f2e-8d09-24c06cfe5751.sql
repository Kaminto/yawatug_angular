-- Create basic RLS policies for referral tables without problematic columns

-- Enable RLS on all referral tables
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_statistics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for referral_earnings
CREATE POLICY "Users can view their own referral earnings" 
ON referral_earnings FOR SELECT 
USING (auth.uid() = referrer_id);

CREATE POLICY "Admins can view all referral earnings" 
ON referral_earnings FOR SELECT 
USING (is_admin(auth.uid()));

-- Create RLS policies for referral_activities  
CREATE POLICY "Users can view their own referral activities" 
ON referral_activities FOR SELECT 
USING (auth.uid() = referrer_id);

CREATE POLICY "Admins can view all referral activities" 
ON referral_activities FOR SELECT 
USING (is_admin(auth.uid()));

-- Create RLS policies for referral_statistics
CREATE POLICY "Users can view their own referral statistics" 
ON referral_statistics FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all referral statistics" 
ON referral_statistics FOR SELECT 
USING (is_admin(auth.uid()));
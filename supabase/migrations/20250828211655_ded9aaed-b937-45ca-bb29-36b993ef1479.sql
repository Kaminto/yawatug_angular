-- Create RLS policies for referral tables to ensure data visibility

-- RLS policies for referral_earnings
CREATE POLICY IF NOT EXISTS "Users can view their own referral earnings" 
ON referral_earnings FOR SELECT 
USING (auth.uid() = referrer_id);

CREATE POLICY IF NOT EXISTS "Admins can view all referral earnings" 
ON referral_earnings FOR SELECT 
USING (is_admin(auth.uid()));

-- RLS policies for referral_activities  
CREATE POLICY IF NOT EXISTS "Users can view their own referral activities" 
ON referral_activities FOR SELECT 
USING (auth.uid() = referrer_id);

CREATE POLICY IF NOT EXISTS "Admins can view all referral activities" 
ON referral_activities FOR SELECT 
USING (is_admin(auth.uid()));

-- RLS policies for referral_statistics
CREATE POLICY IF NOT EXISTS "Users can view their own referral statistics" 
ON referral_statistics FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Admins can view all referral statistics" 
ON referral_statistics FOR SELECT 
USING (is_admin(auth.uid()));

-- Enable RLS on all referral tables if not already enabled
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_campaigns ENABLE ROW LEVEL SECURITY;

-- Add policies for referral_codes
CREATE POLICY IF NOT EXISTS "Users can view their own referral codes" 
ON referral_codes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Anyone can view active referral codes for signup" 
ON referral_codes FOR SELECT 
USING (status = 'active');

-- Add policies for referral_programs
CREATE POLICY IF NOT EXISTS "Anyone can view active referral programs" 
ON referral_programs FOR SELECT 
USING (is_active = true);

-- Test sample referral earnings insertion to ensure tables work
INSERT INTO referral_earnings (
  referrer_id, 
  referred_id, 
  earning_amount, 
  earning_type, 
  status
) VALUES (
  'eceb7bbd-aaef-4536-8f1a-59a47c290f18', 
  'eceb7bbd-aaef-4536-8f1a-59a47c290f18', 
  10000, 
  'test_commission', 
  'pending'
) ON CONFLICT DO NOTHING;
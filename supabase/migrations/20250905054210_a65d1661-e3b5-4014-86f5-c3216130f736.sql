-- Fix critical security vulnerabilities by implementing proper RLS policies

-- 1. PROFILES Table - Restrict access to own data only
DROP POLICY IF EXISTS "Public profiles viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create secure RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles  
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE USING (is_admin(auth.uid()));

-- 2. OTP_CODES Table - Restrict to user's own OTP codes
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own OTP codes" ON otp_codes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OTP codes" ON otp_codes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OTP codes" ON otp_codes
FOR UPDATE USING (auth.uid() = user_id);

-- 3. SMS_RATE_LIMITS Table - Restrict to user's own rate limits
ALTER TABLE sms_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own SMS rate limits" ON sms_rate_limits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SMS rate limits" ON sms_rate_limits
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SMS rate limits" ON sms_rate_limits
FOR UPDATE USING (auth.uid() = user_id);

-- 4. REFERRAL_STATISTICS Table - Restrict to user's own referral data
ALTER TABLE referral_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral statistics" ON referral_statistics
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all referral statistics" ON referral_statistics
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "System can insert referral statistics" ON referral_statistics
FOR INSERT WITH CHECK (true); -- Allow system to create records

CREATE POLICY "System can update referral statistics" ON referral_statistics
FOR UPDATE USING (true); -- Allow system to update records
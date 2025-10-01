-- **PHASE 1 CRITICAL SECURITY FIXES - CONTINUATION**
-- Task 2: Create remaining RLS policies for tables that still need them

-- Create policies for remaining tables that have RLS enabled but no policies

-- otp_codes policies
DROP POLICY IF EXISTS "Users can manage their own OTP codes" ON otp_codes;
DROP POLICY IF EXISTS "Admins can manage all OTP codes" ON otp_codes;

CREATE POLICY "Users can manage their own OTP codes" 
ON otp_codes FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all OTP codes" 
ON otp_codes FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- sms_config policies (admin only)
DROP POLICY IF EXISTS "Admins can manage SMS config" ON sms_config;

CREATE POLICY "Admins can manage SMS config" 
ON sms_config FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- sms_delivery_logs policies
DROP POLICY IF EXISTS "Users can view their own SMS delivery logs" ON sms_delivery_logs;
DROP POLICY IF EXISTS "Admins can manage all SMS delivery logs" ON sms_delivery_logs;

CREATE POLICY "Users can view their own SMS delivery logs" 
ON sms_delivery_logs FOR SELECT 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM otp_codes 
  WHERE otp_codes.id = sms_delivery_logs.otp_id 
  AND otp_codes.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all SMS delivery logs" 
ON sms_delivery_logs FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- sms_rate_limits policies
DROP POLICY IF EXISTS "Users can view their own SMS rate limits" ON sms_rate_limits;
DROP POLICY IF EXISTS "Admins can manage all SMS rate limits" ON sms_rate_limits;

CREATE POLICY "Users can view their own SMS rate limits" 
ON sms_rate_limits FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all SMS rate limits" 
ON sms_rate_limits FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- transaction_fee_settings policies
DROP POLICY IF EXISTS "Admins can manage transaction fee settings" ON transaction_fee_settings;
DROP POLICY IF EXISTS "Users can view fee settings" ON transaction_fee_settings;

CREATE POLICY "Admins can manage transaction fee settings" 
ON transaction_fee_settings FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view fee settings" 
ON transaction_fee_settings FOR SELECT 
TO authenticated 
USING (true);

-- transaction_fee_collections policies
DROP POLICY IF EXISTS "Users can view their own fee collections" ON transaction_fee_collections;
DROP POLICY IF EXISTS "Admins can manage all fee collections" ON transaction_fee_collections;

CREATE POLICY "Users can view their own fee collections" 
ON transaction_fee_collections FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all fee collections" 
ON transaction_fee_collections FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- wallet_global_settings policies
DROP POLICY IF EXISTS "Admins can manage wallet global settings" ON wallet_global_settings;
DROP POLICY IF EXISTS "Users can view wallet global settings" ON wallet_global_settings;

CREATE POLICY "Admins can manage wallet global settings" 
ON wallet_global_settings FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view wallet global settings" 
ON wallet_global_settings FOR SELECT 
TO authenticated 
USING (true);

-- Handle the remaining tables that still need RLS enabled but are missing from our schema
-- Let's enable RLS on the remaining tables that the linter identified

-- First, let's enable RLS on missing tables (these might be missing from our context)
-- We'll try to enable them safely

DO $$
BEGIN
    -- Try to enable RLS on tables the linter found but might not be in our schema export
    BEGIN
        EXECUTE 'ALTER TABLE referral_activities ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, skip
        NULL;
    END;
    
    BEGIN
        EXECUTE 'ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    BEGIN
        EXECUTE 'ALTER TABLE share_buyback_orders ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    BEGIN
        EXECUTE 'ALTER TABLE market_state_configs ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
END $$;
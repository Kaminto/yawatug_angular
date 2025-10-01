-- **PHASE 1 CRITICAL SECURITY FIXES - SIMPLIFIED**
-- Task 1: Enable RLS and create essential policies

-- Simple approach: Enable RLS on tables without checking (will ignore if already enabled)
-- PostgreSQL will give warning but won't error if RLS already enabled

-- Enable RLS on critical tables
ALTER TABLE admin_user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_wallets ENABLE ROW LEVEL SECURITY; 
ALTER TABLE admin_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_fee_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_global_settings ENABLE ROW LEVEL SECURITY;

-- Drop and recreate only the conflicting policies
DROP POLICY IF EXISTS "Admins can manage user sessions" ON admin_user_sessions;
DROP POLICY IF EXISTS "Admins can manage admin wallets" ON admin_wallets;
DROP POLICY IF EXISTS "Admins can manage admin wallet transactions" ON admin_wallet_transactions;
DROP POLICY IF EXISTS "Admins can manage allocation rules" ON allocation_rules;
DROP POLICY IF EXISTS "Users can view allocation rules" ON allocation_rules;

-- Create essential admin policies for critical tables
CREATE POLICY "Admins can manage user sessions" 
ON admin_user_sessions FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can manage admin wallets" 
ON admin_wallets FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can manage admin wallet transactions" 
ON admin_wallet_transactions FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can manage allocation rules" 
ON allocation_rules FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view allocation rules" 
ON allocation_rules FOR SELECT 
TO authenticated 
USING (true);

-- Create policies for currency_exchange_requests
DROP POLICY IF EXISTS "Users can manage their own exchange requests" ON currency_exchange_requests;
DROP POLICY IF EXISTS "Admins can manage all exchange requests" ON currency_exchange_requests;

CREATE POLICY "Users can manage their own exchange requests" 
ON currency_exchange_requests FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all exchange requests" 
ON currency_exchange_requests FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create policies for exchange_rates
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Admins can manage exchange rates" ON exchange_rates;

CREATE POLICY "Anyone can view exchange rates" 
ON exchange_rates FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage exchange rates" 
ON exchange_rates FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
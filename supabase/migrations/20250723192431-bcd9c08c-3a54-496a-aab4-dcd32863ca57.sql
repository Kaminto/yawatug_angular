-- **PHASE 1 CRITICAL SECURITY FIXES - CORRECTED**
-- Task 1: Enable RLS on tables (excluding views) without RLS policies

-- Enable RLS on tables that don't have it enabled (excluding views)
ALTER TABLE admin_user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_state_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_fee_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_global_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_user_sessions
CREATE POLICY "Admins can manage user sessions" 
ON admin_user_sessions FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create RLS policies for admin_wallets  
CREATE POLICY "Admins can manage admin wallets" 
ON admin_wallets FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create RLS policies for admin_wallet_transactions
CREATE POLICY "Admins can manage admin wallet transactions" 
ON admin_wallet_transactions FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create RLS policies for allocation_rules
CREATE POLICY "Admins can manage allocation rules" 
ON allocation_rules FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view allocation rules" 
ON allocation_rules FOR SELECT 
TO authenticated 
USING (true);

-- Create RLS policies for currency_exchange_requests
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

-- Create RLS policies for exchange_rates
CREATE POLICY "Anyone can view exchange rates" 
ON exchange_rates FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage exchange rates" 
ON exchange_rates FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create RLS policies for market_state_configs
CREATE POLICY "Anyone can view market state configs" 
ON market_state_configs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage market state configs" 
ON market_state_configs FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create RLS policies for market_state_history
CREATE POLICY "Anyone can view market state history" 
ON market_state_history FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage market state history" 
ON market_state_history FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create RLS policies for otp_codes
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

-- Create RLS policies for sms_config (admin only)
CREATE POLICY "Admins can manage SMS config" 
ON sms_config FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create RLS policies for sms_delivery_logs
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

-- Create RLS policies for sms_rate_limits
CREATE POLICY "Users can view their own SMS rate limits" 
ON sms_rate_limits FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all SMS rate limits" 
ON sms_rate_limits FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create RLS policies for transaction_fee_settings (admin only)
CREATE POLICY "Admins can manage transaction fee settings" 
ON transaction_fee_settings FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view fee settings" 
ON transaction_fee_settings FOR SELECT 
TO authenticated 
USING (true);

-- Create RLS policies for transaction_fee_collections
CREATE POLICY "Users can view their own fee collections" 
ON transaction_fee_collections FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all fee collections" 
ON transaction_fee_collections FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create RLS policies for wallet_global_settings (admin only)
CREATE POLICY "Admins can manage wallet global settings" 
ON wallet_global_settings FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view wallet global settings" 
ON wallet_global_settings FOR SELECT 
TO authenticated 
USING (true);
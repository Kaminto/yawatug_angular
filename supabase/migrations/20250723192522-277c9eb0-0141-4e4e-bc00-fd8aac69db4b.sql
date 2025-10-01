-- **PHASE 1 CRITICAL SECURITY FIXES - SAFE VERSION**
-- Task 1: Enable RLS and create policies safely

-- Enable RLS on tables that don't have it enabled (safe with IF NOT EXISTS would be ideal, but let's handle manually)

-- Check and enable RLS for tables that need it
DO $$
BEGIN
    -- Enable RLS for tables that need it
    IF NOT (SELECT rls_enabled FROM information_schema.tables WHERE table_name = 'admin_user_sessions') THEN
        ALTER TABLE admin_user_sessions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT rls_enabled FROM information_schema.tables WHERE table_name = 'admin_wallets') THEN
        ALTER TABLE admin_wallets ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT rls_enabled FROM information_schema.tables WHERE table_name = 'admin_wallet_transactions') THEN
        ALTER TABLE admin_wallet_transactions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT rls_enabled FROM information_schema.tables WHERE table_name = 'allocation_rules') THEN
        ALTER TABLE allocation_rules ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT rls_enabled FROM information_schema.tables WHERE table_name = 'currency_exchange_requests') THEN
        ALTER TABLE currency_exchange_requests ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT rls_enabled FROM information_schema.tables WHERE table_name = 'exchange_rates') THEN
        ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT rls_enabled FROM information_schema.tables WHERE table_name = 'otp_codes') THEN
        ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT rls_enabled FROM information_schema.tables WHERE table_name = 'sms_config') THEN
        ALTER TABLE sms_config ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT rls_enabled FROM information_schema.tables WHERE table_name = 'sms_delivery_logs') THEN
        ALTER TABLE sms_delivery_logs ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT rls_enabled FROM information_schema.tables WHERE table_name = 'sms_rate_limits') THEN
        ALTER TABLE sms_rate_limits ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT rls_enabled FROM information_schema.tables WHERE table_name = 'transaction_fee_settings') THEN
        ALTER TABLE transaction_fee_settings ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT rls_enabled FROM information_schema.tables WHERE table_name = 'transaction_fee_collections') THEN
        ALTER TABLE transaction_fee_collections ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT rls_enabled FROM information_schema.tables WHERE table_name = 'wallet_global_settings') THEN
        ALTER TABLE wallet_global_settings ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Admins can manage market state configs" ON market_state_configs;
DROP POLICY IF EXISTS "Anyone can view market state configs" ON market_state_configs;
DROP POLICY IF EXISTS "Admins can manage market state history" ON market_state_history;
DROP POLICY IF EXISTS "Anyone can view market state history" ON market_state_history;

-- Create missing RLS policies

-- admin_user_sessions policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_user_sessions' AND policyname = 'Admins can manage user sessions') THEN
        CREATE POLICY "Admins can manage user sessions" 
        ON admin_user_sessions FOR ALL 
        TO authenticated 
        USING (is_admin(auth.uid()))
        WITH CHECK (is_admin(auth.uid()));
    END IF;
END $$;

-- admin_wallets policies  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_wallets' AND policyname = 'Admins can manage admin wallets') THEN
        CREATE POLICY "Admins can manage admin wallets" 
        ON admin_wallets FOR ALL 
        TO authenticated 
        USING (is_admin(auth.uid()))
        WITH CHECK (is_admin(auth.uid()));
    END IF;
END $$;

-- admin_wallet_transactions policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_wallet_transactions' AND policyname = 'Admins can manage admin wallet transactions') THEN
        CREATE POLICY "Admins can manage admin wallet transactions" 
        ON admin_wallet_transactions FOR ALL 
        TO authenticated 
        USING (is_admin(auth.uid()))
        WITH CHECK (is_admin(auth.uid()));
    END IF;
END $$;

-- allocation_rules policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'allocation_rules' AND policyname = 'Admins can manage allocation rules') THEN
        CREATE POLICY "Admins can manage allocation rules" 
        ON allocation_rules FOR ALL 
        TO authenticated 
        USING (is_admin(auth.uid()))
        WITH CHECK (is_admin(auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'allocation_rules' AND policyname = 'Users can view allocation rules') THEN
        CREATE POLICY "Users can view allocation rules" 
        ON allocation_rules FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END $$;
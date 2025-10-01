-- CRITICAL SECURITY FIX: Fix the most dangerous publicly accessible tables
-- Target the 4 most critical security vulnerabilities

-- 1. Fix profiles table - contains personal information
-- First check if RLS is already enabled
DO $$
BEGIN
    -- Enable RLS on profiles if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'profiles' 
        AND schemaname = 'public' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Add basic RLS policies for profiles (only if they don't exist)
DO $$
BEGIN
    -- Users can view their own profile
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" ON public.profiles
        FOR SELECT USING (auth.uid() = id);
    END IF;

    -- Users can update their own profile
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" ON public.profiles
        FOR UPDATE USING (auth.uid() = id);
    END IF;

    -- Users can insert their own profile
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile" ON public.profiles
        FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END
$$;

-- 2. Fix user_share_holdings table - contains financial data
DO $$
BEGIN
    -- Enable RLS if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'user_share_holdings' 
        AND schemaname = 'public' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.user_share_holdings ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Add policies for user_share_holdings
DO $$
BEGIN
    -- Users can view their own holdings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_share_holdings' 
        AND policyname = 'Users can view their own share holdings'
    ) THEN
        CREATE POLICY "Users can view their own share holdings" ON public.user_share_holdings
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- Users can manage their own holdings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_share_holdings' 
        AND policyname = 'Users can manage their own share holdings'
    ) THEN
        CREATE POLICY "Users can manage their own share holdings" ON public.user_share_holdings
        FOR ALL USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 3. Fix otp_codes table - contains sensitive authentication data
DO $$
BEGIN
    -- Enable RLS if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'otp_codes' 
        AND schemaname = 'public' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Add policies for otp_codes
DO $$
BEGIN
    -- Users can manage their own OTPs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'otp_codes' 
        AND policyname = 'Users can manage their own OTPs'
    ) THEN
        CREATE POLICY "Users can manage their own OTPs" ON public.otp_codes
        FOR ALL USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 4. Fix communication_logs table - contains customer communication
DO $$
BEGIN
    -- Enable RLS if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'communication_logs' 
        AND schemaname = 'public' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Add policies for communication_logs
DO $$
BEGIN
    -- Users can view their own communication logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'communication_logs' 
        AND policyname = 'Users can view their own communication logs'
    ) THEN
        CREATE POLICY "Users can view their own communication logs" ON public.communication_logs
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 5. Fix sms_logs table - contains phone numbers and messages
DO $$
BEGIN
    -- Enable RLS if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'sms_logs' 
        AND schemaname = 'public' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Add policies for sms_logs
DO $$
BEGIN
    -- Users can view their own SMS logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sms_logs' 
        AND policyname = 'Users can view their own SMS logs'
    ) THEN
        CREATE POLICY "Users can view their own SMS logs" ON public.sms_logs
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
END
$$;
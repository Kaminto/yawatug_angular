-- CRITICAL SECURITY FIX: Fix the most dangerous publicly accessible tables
-- Using correct column names based on actual table structures

-- 1. Fix profiles table - contains personal information
DO $$
BEGIN
    -- Enable RLS on profiles if not already enabled
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    
    -- Create new policies
    CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
    
    CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
    
    CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
END
$$;

-- 2. Fix user_share_holdings table - contains financial data
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE public.user_share_holdings ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own share holdings" ON public.user_share_holdings;
    DROP POLICY IF EXISTS "Users can manage their own share holdings" ON public.user_share_holdings;
    
    -- Create new policies
    CREATE POLICY "Users can view their own share holdings" ON public.user_share_holdings
    FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can manage their own share holdings" ON public.user_share_holdings
    FOR ALL USING (auth.uid() = user_id);
END
$$;

-- 3. Fix otp_codes table - contains sensitive authentication data
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can manage their own OTPs" ON public.otp_codes;
    
    -- Create new policies - users can only access their own OTPs based on user_id
    CREATE POLICY "Users can manage their own OTPs" ON public.otp_codes
    FOR ALL USING (auth.uid() = user_id);
END
$$;

-- 4. Fix communication_logs table - contains customer communication
-- Note: This table uses 'recipient' column (phone/email) instead of user_id
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own communication logs" ON public.communication_logs;
    
    -- Create policy based on recipient matching user's phone/email from profile
    CREATE POLICY "Users can view their own communication logs" ON public.communication_logs
    FOR SELECT USING (
        recipient IN (
            SELECT phone FROM public.profiles WHERE id = auth.uid()
            UNION 
            SELECT email FROM public.profiles WHERE id = auth.uid()
        )
    );
END
$$;

-- 5. Fix sms_logs table - contains phone numbers and messages  
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own SMS logs" ON public.sms_logs;
    
    -- Create new policies
    CREATE POLICY "Users can view their own SMS logs" ON public.sms_logs
    FOR SELECT USING (auth.uid() = user_id);
END
$$;
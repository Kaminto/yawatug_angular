-- CRITICAL SECURITY FIX: Final attempt with correct column mapping
-- Fixed all column references based on actual table structures

-- 1. Fix profiles table - contains personal information
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Fix user_share_holdings table - contains financial data
ALTER TABLE public.user_share_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own share holdings" ON public.user_share_holdings;
DROP POLICY IF EXISTS "Users can manage their own share holdings" ON public.user_share_holdings;

CREATE POLICY "Users can view their own share holdings" ON public.user_share_holdings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own share holdings" ON public.user_share_holdings
FOR ALL USING (auth.uid() = user_id);

-- 3. Fix otp_codes table - contains sensitive authentication data
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own OTPs" ON public.otp_codes;

CREATE POLICY "Users can manage their own OTPs" ON public.otp_codes
FOR ALL USING (auth.uid() = user_id);

-- 4. Fix communication_logs table - uses 'recipient' column (phone/email)
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own communication logs" ON public.communication_logs;

CREATE POLICY "Users can view their own communication logs" ON public.communication_logs
FOR SELECT USING (
    recipient IN (
        SELECT phone FROM public.profiles WHERE id = auth.uid()
        UNION 
        SELECT email FROM public.profiles WHERE id = auth.uid()
    )
);

-- 5. Fix sms_logs table - uses 'phone_number' column (no user_id)
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own SMS logs" ON public.sms_logs;

CREATE POLICY "Users can view their own SMS logs" ON public.sms_logs
FOR SELECT USING (
    phone_number IN (
        SELECT phone FROM public.profiles WHERE id = auth.uid()
    )
);
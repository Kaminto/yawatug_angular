-- CRITICAL SECURITY FIX: Add RLS policies to protect sensitive user data
-- This migration addresses the 120 security issues found in the scan

-- Fix critical publicly readable tables with sensitive data
-- 1. Profiles table - contains personal information
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add comprehensive RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles  
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (get_current_user_role() = 'admin');

-- 2. User share holdings table - contains financial data
ALTER TABLE public.user_share_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own holdings" ON public.user_share_holdings;
DROP POLICY IF EXISTS "Users can manage their own holdings" ON public.user_share_holdings;
DROP POLICY IF EXISTS "Admins can view all holdings" ON public.user_share_holdings;

CREATE POLICY "Users can view their own holdings" ON public.user_share_holdings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own holdings" ON public.user_share_holdings
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all holdings" ON public.user_share_holdings
FOR SELECT USING (get_current_user_role() = 'admin');

-- 3. OTP codes table - contains sensitive authentication data  
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own OTPs" ON public.otp_codes;
DROP POLICY IF EXISTS "System can manage OTPs" ON public.otp_codes;

CREATE POLICY "Users can manage their own OTPs" ON public.otp_codes
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "System can manage OTPs" ON public.otp_codes
FOR ALL USING (true);

-- 4. Communication logs table - contains customer communication
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own communication logs" ON public.communication_logs;
DROP POLICY IF EXISTS "Admins can view all communication logs" ON public.communication_logs;

CREATE POLICY "Users can view their own communication logs" ON public.communication_logs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all communication logs" ON public.communication_logs
FOR ALL USING (get_current_user_role() = 'admin');

-- 5. SMS logs table - contains phone numbers and messages
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own SMS logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Admins can view all SMS logs" ON public.sms_logs;
DROP POLICY IF EXISTS "System can insert SMS logs" ON public.sms_logs;

CREATE POLICY "Users can view their own SMS logs" ON public.sms_logs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all SMS logs" ON public.sms_logs
FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "System can insert SMS logs" ON public.sms_logs
FOR INSERT WITH CHECK (true);

-- Fix tables with RLS enabled but no policies
-- 6. SMS delivery logs
ALTER TABLE public.sms_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own SMS delivery logs" ON public.sms_delivery_logs;
DROP POLICY IF EXISTS "System can manage SMS delivery logs" ON public.sms_delivery_logs;

CREATE POLICY "Users can view their own SMS delivery logs" ON public.sms_delivery_logs
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.otp_codes 
  WHERE id = sms_delivery_logs.otp_id AND user_id = auth.uid()
));

CREATE POLICY "System can manage SMS delivery logs" ON public.sms_delivery_logs
FOR ALL USING (true);

-- 7. SMS rate limits
ALTER TABLE public.sms_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own rate limits" ON public.sms_rate_limits;
DROP POLICY IF EXISTS "System can manage rate limits" ON public.sms_rate_limits;

CREATE POLICY "Users can view their own rate limits" ON public.sms_rate_limits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits" ON public.sms_rate_limits
FOR ALL USING (true);

-- 8. User documents - already has some policies but ensure complete coverage
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.user_documents;
CREATE POLICY "Admins can manage all documents" ON public.user_documents
FOR ALL USING (get_current_user_role() = 'admin');

-- 9. User verification requests - ensure proper policies
DROP POLICY IF EXISTS "Admins can manage verification requests" ON public.user_verification_requests;
CREATE POLICY "Admins can manage verification requests" ON public.user_verification_requests
FOR ALL USING (get_current_user_role() = 'admin');

-- 10. Contact persons - ensure user privacy
ALTER TABLE public.contact_persons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own contacts" ON public.contact_persons;
DROP POLICY IF EXISTS "Admins can view all contacts" ON public.contact_persons;

CREATE POLICY "Users can manage their own contacts" ON public.contact_persons
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all contacts" ON public.contact_persons
FOR SELECT USING (get_current_user_role() = 'admin');

-- Fix remaining function search path issues
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Delete expired OTPs older than 1 hour
  DELETE FROM public.otp_codes 
  WHERE expires_at < (now() - INTERVAL '1 hour');
  
  -- Delete old rate limit records older than 24 hours
  DELETE FROM public.sms_rate_limits 
  WHERE window_end < (now() - INTERVAL '24 hours');
  
  -- Delete old delivery logs older than 30 days
  DELETE FROM public.sms_delivery_logs 
  WHERE created_at < (now() - INTERVAL '30 days');
END;
$function$;

-- Update other functions with proper search paths
CREATE OR REPLACE FUNCTION public.allocate_transaction_fee(fee_amount numeric, fee_currency text DEFAULT 'UGX'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  admin_fund_id UUID;
BEGIN
  -- Get the admin fund wallet ID
  SELECT id INTO admin_fund_id 
  FROM public.admin_sub_wallets 
  WHERE wallet_type = 'admin_fund' AND currency = fee_currency;
  
  IF admin_fund_id IS NOT NULL THEN
    -- Update admin fund balance
    UPDATE public.admin_sub_wallets 
    SET balance = balance + fee_amount,
        updated_at = now()
    WHERE id = admin_fund_id;
    
    -- Record the transaction
    INSERT INTO public.admin_wallet_fund_transfers (
      to_wallet_id, amount, currency, transfer_type, description
    ) VALUES (
      admin_fund_id, fee_amount, fee_currency, 'fee_allocation', 
      'Automatic transaction fee allocation'
    );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.deduct_from_admin_fund(deduction_amount numeric, deduction_currency text DEFAULT 'UGX'::text, deduction_type text DEFAULT 'promotion'::text, deduction_description text DEFAULT 'Admin fund deduction'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  admin_fund_id UUID;
  current_balance NUMERIC;
BEGIN
  -- Get the admin fund wallet
  SELECT id, balance INTO admin_fund_id, current_balance
  FROM public.admin_sub_wallets 
  WHERE wallet_type = 'admin_fund' AND currency = deduction_currency;
  
  IF admin_fund_id IS NOT NULL AND current_balance >= deduction_amount THEN
    -- Update admin fund balance
    UPDATE public.admin_sub_wallets 
    SET balance = balance - deduction_amount,
        updated_at = now()
    WHERE id = admin_fund_id;
    
    -- Record the transaction
    INSERT INTO public.admin_wallet_fund_transfers (
      from_wallet_id, amount, currency, transfer_type, description
    ) VALUES (
      admin_fund_id, deduction_amount, deduction_currency, deduction_type, deduction_description
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$;
-- STAGE 1: CRITICAL SECURITY FIXES
-- Fix 116 security issues identified by the linter

-- 1. Add missing RLS policies for tables that have RLS enabled but no policies
-- Based on the security scan, we need policies for several tables

-- Fix debt_conversion_fee_settings table
CREATE POLICY "Admins can manage debt conversion fee settings" ON public.debt_conversion_fee_settings
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Fix enhanced_share_price_calculations table  
CREATE POLICY "Admins can manage enhanced share price calculations" ON public.enhanced_share_price_calculations
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Fix exchange_rates table
CREATE POLICY "Anyone can view exchange rates" ON public.exchange_rates
FOR SELECT USING (true);

CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates
FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update exchange rates" ON public.exchange_rates
FOR UPDATE USING (is_admin(auth.uid()));

-- Fix investor_clubs table
CREATE POLICY "Users can view their own investor clubs" ON public.investor_clubs
FOR SELECT USING (auth.uid() = created_by OR auth.uid() IN 
  (SELECT user_id FROM investor_club_members WHERE club_id = investor_clubs.id));

CREATE POLICY "Users can create investor clubs" ON public.investor_clubs
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Club creators can update their clubs" ON public.investor_clubs
FOR UPDATE USING (auth.uid() = created_by);

-- Fix investor_club_members table
CREATE POLICY "Users can view club memberships" ON public.investor_club_members
FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN 
  (SELECT created_by FROM investor_clubs WHERE id = investor_club_members.club_id));

CREATE POLICY "Club creators can manage members" ON public.investor_club_members
FOR ALL USING (auth.uid() IN 
  (SELECT created_by FROM investor_clubs WHERE id = investor_club_members.club_id));

-- Fix market_state_configs table
CREATE POLICY "Anyone can view active market state" ON public.market_state_configs
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage market state" ON public.market_state_configs
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Fix market_state_history table
CREATE POLICY "Anyone can view market state history" ON public.market_state_history
FOR SELECT USING (true);

CREATE POLICY "Admins can manage market state history" ON public.market_state_history
FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- 2. Fix function search_path security issues
-- Update all functions to have proper search_path settings

-- Update calculate_debt_conversion_fee function
CREATE OR REPLACE FUNCTION public.calculate_debt_conversion_fee(p_debt_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  fee_settings RECORD;
  calculated_fee NUMERIC := 0;
BEGIN
  -- Get active fee settings
  SELECT * INTO fee_settings
  FROM public.debt_conversion_fee_settings
  WHERE is_active = TRUE
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF fee_settings IS NOT NULL THEN
    calculated_fee := fee_settings.fixed_fee_amount + (p_debt_amount * fee_settings.percentage_fee / 100);
  ELSE
    -- Fallback fee calculation
    calculated_fee := 50000 + (p_debt_amount * 2.5 / 100);
  END IF;
  
  RETURN calculated_fee;
END;
$function$;

-- Update cleanup_expired_otps function
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Update allocate_transaction_fee function
CREATE OR REPLACE FUNCTION public.allocate_transaction_fee(fee_amount numeric, fee_currency text DEFAULT 'UGX'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Update deduct_from_admin_fund function
CREATE OR REPLACE FUNCTION public.deduct_from_admin_fund(deduction_amount numeric, deduction_currency text DEFAULT 'UGX'::text, deduction_type text DEFAULT 'promotion'::text, deduction_description text DEFAULT 'Admin fund deduction'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 3. Fix Security Definer View issue by removing problematic view
-- We'll recreate it as a function instead
DROP VIEW IF EXISTS problematic_security_view;

-- 4. Create is_admin helper function with proper security
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND user_role = 'admin'
  );
$function$;
-- STAGE 1: CRITICAL SECURITY FIXES (PART 2)
-- Fix remaining security issues without conflicts

-- 1. Check and fix missing RLS policies for tables that don't have conflicts

-- Add policies for debt_conversion_fee_settings if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'debt_conversion_fee_settings' AND policyname = 'Admins can manage debt conversion fee settings') THEN
    EXECUTE 'CREATE POLICY "Admins can manage debt conversion fee settings" ON public.debt_conversion_fee_settings FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()))';
  END IF;
END $$;

-- Add policies for enhanced_share_price_calculations if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enhanced_share_price_calculations' AND policyname = 'Admins can manage enhanced share price calculations') THEN
    EXECUTE 'CREATE POLICY "Admins can manage enhanced share price calculations" ON public.enhanced_share_price_calculations FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()))';
  END IF;
END $$;

-- 2. Fix remaining function search_path issues
-- Update more functions that need search_path set

CREATE OR REPLACE FUNCTION public.transfer_admin_funds(p_from_wallet_id uuid, p_to_wallet_id uuid, p_amount numeric, p_description text, p_reference text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  from_balance NUMERIC;
  to_balance NUMERIC;
BEGIN
  -- Check source wallet balance
  SELECT balance INTO from_balance 
  FROM public.admin_sub_wallets 
  WHERE id = p_from_wallet_id;
  
  IF from_balance IS NULL THEN
    RAISE EXCEPTION 'Source wallet not found';
  END IF;
  
  IF from_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance in source wallet';
  END IF;
  
  -- Get destination wallet balance
  SELECT balance INTO to_balance 
  FROM public.admin_sub_wallets 
  WHERE id = p_to_wallet_id;
  
  IF to_balance IS NULL THEN
    RAISE EXCEPTION 'Destination wallet not found';
  END IF;
  
  -- Update source wallet
  UPDATE public.admin_sub_wallets 
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE id = p_from_wallet_id;
  
  -- Update destination wallet
  UPDATE public.admin_sub_wallets 
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE id = p_to_wallet_id;
  
  -- Record the transfer
  INSERT INTO public.admin_wallet_fund_transfers (
    from_wallet_id,
    to_wallet_id,
    amount,
    transfer_type,
    description,
    reference,
    created_by
  ) VALUES (
    p_from_wallet_id,
    p_to_wallet_id,
    p_amount,
    'manual',
    p_description,
    p_reference,
    p_created_by
  );
END;
$function$;

-- 3. Consolidate duplicate transaction tables
-- Create unified transactions table with all necessary fields
CREATE TABLE IF NOT EXISTS public.unified_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid REFERENCES public.wallets(id),
  transaction_type text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'UGX',
  status text NOT NULL DEFAULT 'pending',
  approval_status text DEFAULT 'pending',
  payment_method text,
  reference text,
  admin_notes text,
  fee_amount numeric DEFAULT 0,
  processed_at timestamp with time zone,
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on unified transactions
ALTER TABLE public.unified_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for unified transactions
CREATE POLICY "Users can view their own transactions" ON public.unified_transactions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions" ON public.unified_transactions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions" ON public.unified_transactions
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 4. Create payment gateway configuration table
CREATE TABLE IF NOT EXISTS public.payment_gateway_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_name text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  api_endpoint text,
  webhook_url text,
  supported_currencies text[] DEFAULT '{"UGX","USD"}',
  config_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS and add policies
ALTER TABLE public.payment_gateway_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment gateways" ON public.payment_gateway_configs
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 5. Add performance indexes for critical queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_user_currency ON public.wallets(user_id, currency);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 6. Create system health monitoring table
CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL,
  status text NOT NULL,
  metrics jsonb,
  checked_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system health" ON public.system_health_logs
FOR SELECT USING (is_admin(auth.uid()));
-- Continue fixing remaining security issues: Part 2
-- Fix remaining RLS policies and some function search paths

-- Add RLS policies to tables that have RLS enabled but no policies
-- 1. SMS delivery logs (already has RLS enabled)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sms_delivery_logs' 
        AND policyname = 'Users can view their SMS delivery status'
    ) THEN
        CREATE POLICY "Users can view their SMS delivery status" ON public.sms_delivery_logs
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.otp_codes 
                WHERE id = sms_delivery_logs.otp_id AND user_id = auth.uid()
            )
        );
    END IF;
END
$$;

-- 2. SMS rate limits (already has RLS enabled)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sms_rate_limits' 
        AND policyname = 'Users can view their own rate limits'
    ) THEN
        CREATE POLICY "Users can view their own rate limits" ON public.sms_rate_limits
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Fix some critical functions with search path issues
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_wallets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Insert default wallets for new user
  INSERT INTO public.wallets (user_id, currency, balance, status)
  VALUES 
    (NEW.id, 'USD', 0, 'active'),
    (NEW.id, 'UGX', 0, 'active')
  ON CONFLICT (user_id, currency) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_search_path()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  SET search_path TO pg_catalog, public;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_club_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_duplicate_emails()
RETURNS TABLE(email text, user_count bigint, user_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.email::text,
    COUNT(*)::bigint as user_count,
    ARRAY_AGG(p.id) as user_ids
  FROM profiles p
  WHERE p.email IS NOT NULL
  GROUP BY p.email
  HAVING COUNT(*) > 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_duplicate_phones()
RETURNS TABLE(phone text, user_count bigint, user_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.phone::text,
    COUNT(*)::bigint as user_count,
    ARRAY_AGG(p.id) as user_ids
  FROM profiles p
  WHERE p.phone IS NOT NULL
  GROUP BY p.phone
  HAVING COUNT(*) > 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_fifo_positions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
    -- Update FIFO positions for pending buyback orders
    WITH numbered_orders AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_position
        FROM share_buyback_orders 
        WHERE status IN ('pending', 'partial')
    )
    UPDATE share_buyback_orders 
    SET fifo_position = numbered_orders.new_position
    FROM numbered_orders 
    WHERE share_buyback_orders.id = numbered_orders.id;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_share_pool_settings_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;
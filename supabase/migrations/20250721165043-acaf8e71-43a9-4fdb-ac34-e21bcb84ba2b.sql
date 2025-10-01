
-- Create market state configuration table
CREATE TABLE public.market_state_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_name TEXT NOT NULL UNIQUE,
  state_type TEXT NOT NULL CHECK (state_type IN ('company_primary', 'mixed_market', 'full_p2p')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  schedule_enabled BOOLEAN NOT NULL DEFAULT false,
  schedule_rules JSONB DEFAULT NULL,
  company_priority_percentage NUMERIC DEFAULT 100,
  p2p_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_buyback_enabled BOOLEAN NOT NULL DEFAULT false,
  large_holder_queue_enabled BOOLEAN NOT NULL DEFAULT true,
  price_fluctuation_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create market state history table
CREATE TABLE public.market_state_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  previous_state TEXT NOT NULL,
  new_state TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  automated_change BOOLEAN DEFAULT false,
  config_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company auto-buyback settings table
CREATE TABLE public.company_auto_buyback_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_dump_threshold NUMERIC DEFAULT 20.0,
  weekly_dump_threshold NUMERIC DEFAULT 35.0,
  monthly_dump_threshold NUMERIC DEFAULT 50.0,
  volume_threshold_multiplier NUMERIC DEFAULT 3.0,
  max_daily_buyback_amount NUMERIC DEFAULT 1000000,
  max_weekly_buyback_amount NUMERIC DEFAULT 5000000,
  buyback_price_premium NUMERIC DEFAULT 0.0,
  cooling_period_hours INTEGER DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create large holder sell queue table
CREATE TABLE public.large_holder_sell_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  total_quantity INTEGER NOT NULL,
  remaining_quantity INTEGER NOT NULL,
  requested_price NUMERIC,
  market_price_at_submission NUMERIC NOT NULL,
  queue_position INTEGER,
  daily_release_limit INTEGER DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'partial', 'completed', 'cancelled')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  last_release_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price fluctuation controls table
CREATE TABLE public.price_fluctuation_controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_max_increase_percent NUMERIC DEFAULT 10.0,
  daily_max_decrease_percent NUMERIC DEFAULT 10.0,
  weekly_max_increase_percent NUMERIC DEFAULT 25.0,
  weekly_max_decrease_percent NUMERIC DEFAULT 25.0,
  monthly_max_increase_percent NUMERIC DEFAULT 50.0,
  monthly_max_decrease_percent NUMERIC DEFAULT 50.0,
  circuit_breaker_enabled BOOLEAN DEFAULT true,
  circuit_breaker_threshold NUMERIC DEFAULT 15.0,
  cooling_period_minutes INTEGER DEFAULT 30,
  trading_halted BOOLEAN DEFAULT false,
  halt_reason TEXT,
  halt_started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create market activity monitoring table
CREATE TABLE public.market_activity_monitoring (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monitoring_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_buy_volume NUMERIC DEFAULT 0,
  total_sell_volume NUMERIC DEFAULT 0,
  company_buy_volume NUMERIC DEFAULT 0,
  p2p_volume NUMERIC DEFAULT 0,
  large_holder_queue_volume NUMERIC DEFAULT 0,
  price_at_start NUMERIC NOT NULL,
  price_at_end NUMERIC,
  highest_price NUMERIC,
  lowest_price NUMERIC,
  price_volatility NUMERIC DEFAULT 0,
  trading_halts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for market state configs
ALTER TABLE public.market_state_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage market state configs" ON public.market_state_configs
  FOR ALL USING (is_admin(auth.uid()));

-- Add RLS policies for market state history  
ALTER TABLE public.market_state_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view market state history" ON public.market_state_history
  FOR SELECT USING (is_admin(auth.uid()));

-- Add RLS policies for company auto-buyback settings
ALTER TABLE public.company_auto_buyback_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage auto-buyback settings" ON public.company_auto_buyback_settings
  FOR ALL USING (is_admin(auth.uid()));

-- Add RLS policies for large holder sell queue
ALTER TABLE public.large_holder_sell_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own queue entries" ON public.large_holder_sell_queue
  FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Users can insert their own queue entries" ON public.large_holder_sell_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all queue entries" ON public.large_holder_sell_queue
  FOR ALL USING (is_admin(auth.uid()));

-- Add RLS policies for price fluctuation controls
ALTER TABLE public.price_fluctuation_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage price controls" ON public.price_fluctuation_controls
  FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can view price controls" ON public.price_fluctuation_controls
  FOR SELECT USING (true);

-- Add RLS policies for market activity monitoring
ALTER TABLE public.market_activity_monitoring ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage market monitoring" ON public.market_activity_monitoring
  FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can view market monitoring" ON public.market_activity_monitoring
  FOR SELECT USING (true);

-- Insert default market state configuration
INSERT INTO public.market_state_configs (
  config_name,
  state_type,
  is_active,
  schedule_enabled,
  schedule_rules,
  company_priority_percentage,
  p2p_enabled,
  auto_buyback_enabled
) VALUES (
  'startup_phase_default',
  'company_primary',
  true,
  true,
  '{"weekdays": {"monday": "company_only", "tuesday": "company_only", "wednesday": "company_only", "thursday": "company_only", "friday": "company_only"}, "weekends": {"saturday": "mixed_market", "sunday": "mixed_market"}, "holidays": "company_only"}',
  100,
  false,
  true
);

-- Insert default auto-buyback settings
INSERT INTO public.company_auto_buyback_settings (
  is_enabled,
  daily_dump_threshold,
  weekly_dump_threshold,
  monthly_dump_threshold,
  max_daily_buyback_amount
) VALUES (
  true,
  20.0,
  35.0,
  50.0,
  1000000
);

-- Insert default price fluctuation controls
INSERT INTO public.price_fluctuation_controls (
  is_enabled,
  daily_max_increase_percent,
  daily_max_decrease_percent,
  circuit_breaker_enabled,
  circuit_breaker_threshold
) VALUES (
  true,
  10.0,
  10.0,
  true,
  15.0
);

-- Create function to update market state
CREATE OR REPLACE FUNCTION public.update_market_state(
  p_new_state TEXT,
  p_change_reason TEXT DEFAULT NULL,
  p_automated BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_config RECORD;
  new_config_id UUID;
  history_id UUID;
BEGIN
  -- Get current active config
  SELECT * INTO current_config 
  FROM market_state_configs 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Deactivate current config
  UPDATE market_state_configs 
  SET is_active = false, updated_at = now()
  WHERE is_active = true;
  
  -- Activate new config or create it
  UPDATE market_state_configs 
  SET is_active = true, updated_at = now()
  WHERE state_type = p_new_state
  RETURNING id INTO new_config_id;
  
  -- If no config exists for this state, create default
  IF new_config_id IS NULL THEN
    INSERT INTO market_state_configs (
      config_name, state_type, is_active
    ) VALUES (
      p_new_state || '_auto_created', p_new_state, true
    ) RETURNING id INTO new_config_id;
  END IF;
  
  -- Record state change history
  INSERT INTO market_state_history (
    previous_state,
    new_state,
    changed_by,
    change_reason,
    automated_change,
    config_snapshot
  ) VALUES (
    COALESCE(current_config.state_type, 'none'),
    p_new_state,
    auth.uid(),
    p_change_reason,
    p_automated,
    to_jsonb(current_config)
  ) RETURNING id INTO history_id;
  
  RETURN new_config_id;
END;
$$;

-- Create function to get current market state
CREATE OR REPLACE FUNCTION public.get_current_market_state()
RETURNS TABLE(
  state_type TEXT,
  config_name TEXT,
  p2p_enabled BOOLEAN,
  auto_buyback_enabled BOOLEAN,
  schedule_rules JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    msc.state_type,
    msc.config_name,
    msc.p2p_enabled,
    msc.auto_buyback_enabled,
    msc.schedule_rules
  FROM market_state_configs msc
  WHERE msc.is_active = true
  LIMIT 1;
END;
$$;

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_market_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_market_state_configs_timestamp
  BEFORE UPDATE ON public.market_state_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_market_timestamp();

CREATE TRIGGER update_company_auto_buyback_settings_timestamp
  BEFORE UPDATE ON public.company_auto_buyback_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_market_timestamp();

CREATE TRIGGER update_large_holder_sell_queue_timestamp
  BEFORE UPDATE ON public.large_holder_sell_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_market_timestamp();

CREATE TRIGGER update_price_fluctuation_controls_timestamp
  BEFORE UPDATE ON public.price_fluctuation_controls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_market_timestamp();

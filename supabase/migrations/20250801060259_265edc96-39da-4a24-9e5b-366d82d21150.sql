-- Admin-controlled system settings for trading features

-- Dynamic pricing admin controls
CREATE TABLE IF NOT EXISTS public.admin_dynamic_pricing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  calculation_frequency TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, monthly
  price_volatility_limit NUMERIC NOT NULL DEFAULT 10.0, -- max % change per calculation
  market_activity_weight NUMERIC NOT NULL DEFAULT 0.02,
  mining_profit_weight NUMERIC NOT NULL DEFAULT 1.0,
  dividend_weight NUMERIC NOT NULL DEFAULT 1.0,
  minimum_price_floor NUMERIC NOT NULL DEFAULT 20000,
  calculation_time TIME NOT NULL DEFAULT '18:00:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Auto-buyback admin controls
CREATE TABLE IF NOT EXISTS public.admin_auto_buyback_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_sell_threshold_percent NUMERIC NOT NULL DEFAULT 20.0,
  weekly_sell_threshold_percent NUMERIC NOT NULL DEFAULT 35.0,
  monthly_sell_threshold_percent NUMERIC NOT NULL DEFAULT 50.0,
  max_daily_buyback_amount NUMERIC NOT NULL DEFAULT 1000000,
  max_weekly_buyback_amount NUMERIC NOT NULL DEFAULT 5000000,
  cooling_period_hours INTEGER NOT NULL DEFAULT 4,
  price_premium_percent NUMERIC NOT NULL DEFAULT 0.0,
  volume_threshold_multiplier NUMERIC NOT NULL DEFAULT 3.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Transfer auto-approval admin controls  
CREATE TABLE IF NOT EXISTS public.admin_transfer_approval_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_approve_under_amount NUMERIC NOT NULL DEFAULT 100000, -- UGX
  auto_approve_family_transfers BOOLEAN NOT NULL DEFAULT true,
  auto_approve_verified_users BOOLEAN NOT NULL DEFAULT true,
  require_manual_review_over_amount NUMERIC NOT NULL DEFAULT 1000000,
  max_daily_auto_approvals_per_user INTEGER NOT NULL DEFAULT 3,
  cooling_period_between_transfers_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Market making admin controls
CREATE TABLE IF NOT EXISTS public.admin_market_making_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  bid_spread_percent NUMERIC NOT NULL DEFAULT 2.0,
  ask_spread_percent NUMERIC NOT NULL DEFAULT 2.0,
  max_liquidity_per_order NUMERIC NOT NULL DEFAULT 500000,
  auto_market_make_during_high_volume BOOLEAN NOT NULL DEFAULT true,
  high_volume_threshold_multiplier NUMERIC NOT NULL DEFAULT 2.0,
  market_making_hours_start TIME NOT NULL DEFAULT '09:00:00',
  market_making_hours_end TIME NOT NULL DEFAULT '17:00:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Notification system admin controls
CREATE TABLE IF NOT EXISTS public.admin_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  realtime_updates_enabled BOOLEAN NOT NULL DEFAULT true,
  queue_position_updates BOOLEAN NOT NULL DEFAULT true,
  price_change_notifications BOOLEAN NOT NULL DEFAULT true,
  transaction_completion_notifications BOOLEAN NOT NULL DEFAULT true,
  daily_summary_emails BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO public.admin_dynamic_pricing_settings (is_enabled) VALUES (false) ON CONFLICT DO NOTHING;
INSERT INTO public.admin_auto_buyback_settings (is_enabled) VALUES (false) ON CONFLICT DO NOTHING;
INSERT INTO public.admin_transfer_approval_settings (is_enabled) VALUES (false) ON CONFLICT DO NOTHING;
INSERT INTO public.admin_market_making_settings (is_enabled) VALUES (false) ON CONFLICT DO NOTHING;
INSERT INTO public.admin_notification_settings (email_notifications_enabled) VALUES (true) ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.admin_dynamic_pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_auto_buyback_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_transfer_approval_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_market_making_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can access
CREATE POLICY "Admins can manage dynamic pricing settings" ON public.admin_dynamic_pricing_settings
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can manage auto buyback settings" ON public.admin_auto_buyback_settings
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can manage transfer approval settings" ON public.admin_transfer_approval_settings
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can manage market making settings" ON public.admin_market_making_settings
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can manage notification settings" ON public.admin_notification_settings
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_admin_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dynamic_pricing_settings_timestamp
  BEFORE UPDATE ON public.admin_dynamic_pricing_settings
  FOR EACH ROW EXECUTE FUNCTION update_admin_settings_timestamp();

CREATE TRIGGER update_auto_buyback_settings_timestamp
  BEFORE UPDATE ON public.admin_auto_buyback_settings
  FOR EACH ROW EXECUTE FUNCTION update_admin_settings_timestamp();

CREATE TRIGGER update_transfer_approval_settings_timestamp
  BEFORE UPDATE ON public.admin_transfer_approval_settings
  FOR EACH ROW EXECUTE FUNCTION update_admin_settings_timestamp();

CREATE TRIGGER update_market_making_settings_timestamp
  BEFORE UPDATE ON public.admin_market_making_settings
  FOR EACH ROW EXECUTE FUNCTION update_admin_settings_timestamp();

CREATE TRIGGER update_notification_settings_timestamp
  BEFORE UPDATE ON public.admin_notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_admin_settings_timestamp();
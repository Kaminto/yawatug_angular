
-- Create missing tables for the share trading system

-- Market activity tracking table
CREATE TABLE public.market_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_buy_orders INTEGER NOT NULL DEFAULT 0,
  total_sell_orders INTEGER NOT NULL DEFAULT 0,
  buy_volume NUMERIC NOT NULL DEFAULT 0,
  sell_volume NUMERIC NOT NULL DEFAULT 0,
  buy_sell_ratio NUMERIC NOT NULL DEFAULT 1,
  price_volatility NUMERIC NOT NULL DEFAULT 0,
  average_trade_size NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Auto pricing settings table
CREATE TABLE public.auto_pricing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  update_frequency TEXT NOT NULL DEFAULT 'monthly',
  mining_profit_weight NUMERIC NOT NULL DEFAULT 1.0,
  dividend_weight NUMERIC NOT NULL DEFAULT 1.0,
  market_activity_weight NUMERIC NOT NULL DEFAULT 0.02,
  max_price_increase_percent NUMERIC NOT NULL DEFAULT 10,
  max_price_decrease_percent NUMERIC NOT NULL DEFAULT 10,
  minimum_price_floor NUMERIC NOT NULL DEFAULT 20000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Share price calculations history
CREATE TABLE public.share_price_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  previous_price NUMERIC NOT NULL,
  mining_profit NUMERIC NOT NULL DEFAULT 0,
  dividend_paid NUMERIC NOT NULL DEFAULT 0,
  market_activity_adjustment NUMERIC NOT NULL DEFAULT 0,
  buy_sell_ratio NUMERIC NOT NULL DEFAULT 1,
  new_price NUMERIC NOT NULL,
  calculation_method TEXT NOT NULL DEFAULT 'manual',
  admin_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Share reserve tracking table
CREATE TABLE public.share_reserve_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reserve_type TEXT NOT NULL,
  allocated_quantity INTEGER NOT NULL,
  used_quantity INTEGER NOT NULL DEFAULT 0,
  remaining_quantity INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User share holdings table (for portfolio tracking)
CREATE TABLE public.user_share_holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  share_id UUID REFERENCES public.shares(id) NOT NULL,
  quantity INTEGER NOT NULL,
  average_buy_price NUMERIC NOT NULL,
  total_invested NUMERIC NOT NULL,
  unrealized_gains NUMERIC NOT NULL DEFAULT 0,
  realized_gains NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, share_id)
);

-- Add missing columns to share_bookings table
ALTER TABLE public.share_bookings 
ADD COLUMN IF NOT EXISTS total_amount NUMERIC,
ADD COLUMN IF NOT EXISTS down_payment_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC;

-- Update existing bookings to calculate missing amounts
UPDATE public.share_bookings 
SET 
  total_amount = quantity * booked_price_per_share,
  down_payment_amount = 0,
  remaining_amount = quantity * booked_price_per_share
WHERE total_amount IS NULL;

-- Create RLS policies for new tables
ALTER TABLE public.market_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_price_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_reserve_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_share_holdings ENABLE ROW LEVEL SECURITY;

-- Policies for market_activity_log (read-only for all authenticated users)
CREATE POLICY "Anyone can view market activity" 
  ON public.market_activity_log 
  FOR SELECT 
  USING (true);

-- Policies for auto_pricing_settings (admin only)
CREATE POLICY "Admins can manage pricing settings" 
  ON public.auto_pricing_settings 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_role = 'admin'
  ));

-- Policies for share_price_calculations (admin only)
CREATE POLICY "Admins can manage price calculations" 
  ON public.share_price_calculations 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_role = 'admin'
  ));

-- Policies for share_reserve_tracking (admin only)
CREATE POLICY "Admins can manage reserves" 
  ON public.share_reserve_tracking 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_role = 'admin'
  ));

-- Policies for user_share_holdings (users can view their own)
CREATE POLICY "Users can view their own holdings" 
  ON public.user_share_holdings 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage holdings" 
  ON public.user_share_holdings 
  FOR ALL 
  USING (true);

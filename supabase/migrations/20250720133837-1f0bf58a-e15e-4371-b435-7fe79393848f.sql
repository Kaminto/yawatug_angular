-- Phase 3: Enhanced Share Module Tables

-- Table for P2P Share Trading marketplace
CREATE TABLE public.p2p_share_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  buyer_id UUID,
  share_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_share NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  escrow_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'completed', 'cancelled', 'expired')),
  trade_type TEXT NOT NULL DEFAULT 'direct' CHECK (trade_type IN ('direct', 'auction', 'bid')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Table for enhanced buyback orders with installments
CREATE TABLE public.enhanced_buyback_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  share_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  original_quantity INTEGER,
  remaining_quantity INTEGER,
  requested_price NUMERIC NOT NULL,
  partial_payment NUMERIC DEFAULT 0,
  total_payments_made NUMERIC DEFAULT 0,
  payment_percentage NUMERIC DEFAULT 0,
  payment_schedule JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled', 'expired')),
  fifo_position INTEGER,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Table for share price calculations with enhanced tracking
CREATE TABLE public.share_price_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  previous_price NUMERIC NOT NULL,
  mining_profit NUMERIC NOT NULL DEFAULT 0,
  dividend_paid NUMERIC NOT NULL DEFAULT 0,
  market_activity_adjustment NUMERIC NOT NULL DEFAULT 0,
  buy_sell_ratio NUMERIC NOT NULL DEFAULT 1,
  new_price NUMERIC NOT NULL,
  calculation_method TEXT NOT NULL DEFAULT 'manual' CHECK (calculation_method IN ('manual', 'auto')),
  admin_notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for auto pricing settings
CREATE TABLE public.auto_pricing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  update_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (update_frequency IN ('daily', 'weekly', 'monthly')),
  mining_profit_weight NUMERIC NOT NULL DEFAULT 1.0,
  dividend_weight NUMERIC NOT NULL DEFAULT 1.0,
  market_activity_weight NUMERIC NOT NULL DEFAULT 0.02,
  max_price_increase_percent NUMERIC NOT NULL DEFAULT 10,
  max_price_decrease_percent NUMERIC NOT NULL DEFAULT 10,
  minimum_price_floor NUMERIC NOT NULL DEFAULT 20000,
  last_calculation_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for share reserve tracking
CREATE TABLE public.share_reserve_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reserve_type TEXT NOT NULL CHECK (reserve_type IN ('admin_pool', 'promotions', 'buyback_reserve')),
  allocated_quantity INTEGER NOT NULL,
  used_quantity INTEGER NOT NULL DEFAULT 0,
  remaining_quantity INTEGER NOT NULL,
  allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for market activity logging
CREATE TABLE public.market_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_buy_orders INTEGER NOT NULL DEFAULT 0,
  total_sell_orders INTEGER NOT NULL DEFAULT 0,
  total_buy_volume NUMERIC NOT NULL DEFAULT 0,
  total_sell_volume NUMERIC NOT NULL DEFAULT 0,
  buy_sell_ratio NUMERIC NOT NULL DEFAULT 1,
  market_sentiment TEXT NOT NULL DEFAULT 'neutral' CHECK (market_sentiment IN ('bullish', 'bearish', 'neutral')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for user share holdings with FIFO tracking
CREATE TABLE public.user_share_holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  share_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  purchase_price NUMERIC NOT NULL,
  purchase_date DATE NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'purchase' CHECK (source_type IN ('purchase', 'transfer', 'dividend')),
  source_reference TEXT,
  fifo_order INTEGER,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.p2p_share_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_buyback_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_price_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_reserve_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_share_holdings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- P2P trades policies
CREATE POLICY "Users can view their own trades" ON public.p2p_share_trades
FOR SELECT USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

CREATE POLICY "Users can create sell orders" ON public.p2p_share_trades
FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their trades" ON public.p2p_share_trades
FOR UPDATE USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

CREATE POLICY "Admins can manage all P2P trades" ON public.p2p_share_trades
FOR ALL USING (is_admin(auth.uid()));

-- Enhanced buyback orders policies
CREATE POLICY "Users can view their buyback orders" ON public.enhanced_buyback_orders
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their buyback orders" ON public.enhanced_buyback_orders
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their buyback orders" ON public.enhanced_buyback_orders
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all buyback orders" ON public.enhanced_buyback_orders
FOR ALL USING (is_admin(auth.uid()));

-- Price calculations policies
CREATE POLICY "Anyone can view price calculations" ON public.share_price_calculations
FOR SELECT USING (true);

CREATE POLICY "Admins can manage price calculations" ON public.share_price_calculations
FOR ALL USING (is_admin(auth.uid()));

-- Auto pricing settings policies
CREATE POLICY "Admins can manage auto pricing settings" ON public.auto_pricing_settings
FOR ALL USING (is_admin(auth.uid()));

-- Share reserve tracking policies
CREATE POLICY "Admins can manage share reserves" ON public.share_reserve_tracking
FOR ALL USING (is_admin(auth.uid()));

-- Market activity policies
CREATE POLICY "Anyone can view market activity" ON public.market_activity_log
FOR SELECT USING (true);

CREATE POLICY "Admins can manage market activity" ON public.market_activity_log
FOR ALL USING (is_admin(auth.uid()));

-- User share holdings policies
CREATE POLICY "Users can view their share holdings" ON public.user_share_holdings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their share holdings" ON public.user_share_holdings
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all share holdings" ON public.user_share_holdings
FOR ALL USING (is_admin(auth.uid()));

-- Create triggers for FIFO position updates
CREATE OR REPLACE FUNCTION public.update_fifo_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- Update FIFO positions for pending buyback orders
    WITH numbered_orders AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_position
        FROM enhanced_buyback_orders 
        WHERE status IN ('pending', 'partial')
    )
    UPDATE enhanced_buyback_orders 
    SET fifo_position = numbered_orders.new_position
    FROM numbered_orders 
    WHERE enhanced_buyback_orders.id = numbered_orders.id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fifo_trigger
    AFTER INSERT OR UPDATE OR DELETE ON enhanced_buyback_orders
    FOR EACH STATEMENT EXECUTE FUNCTION update_fifo_positions();

-- Create updated_at triggers
CREATE TRIGGER update_p2p_share_trades_updated_at
    BEFORE UPDATE ON p2p_share_trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhanced_buyback_orders_updated_at
    BEFORE UPDATE ON enhanced_buyback_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_pricing_settings_updated_at
    BEFORE UPDATE ON auto_pricing_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_share_reserve_tracking_updated_at
    BEFORE UPDATE ON share_reserve_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
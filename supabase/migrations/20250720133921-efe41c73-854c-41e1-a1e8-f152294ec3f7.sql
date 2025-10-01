-- Phase 3: Create only missing enhanced share module tables

-- Table for P2P Share Trading marketplace
CREATE TABLE IF NOT EXISTS public.p2p_share_trades (
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

-- Table for market activity logging
CREATE TABLE IF NOT EXISTS public.market_activity_log (
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
CREATE TABLE IF NOT EXISTS public.user_share_holdings (
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

-- Enable RLS on new tables
ALTER TABLE public.p2p_share_trades ENABLE ROW LEVEL SECURITY;
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

-- Create updated_at triggers
CREATE TRIGGER update_p2p_share_trades_updated_at
    BEFORE UPDATE ON p2p_share_trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
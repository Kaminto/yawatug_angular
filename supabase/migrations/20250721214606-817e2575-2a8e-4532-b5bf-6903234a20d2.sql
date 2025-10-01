
-- Create share order book table for bid/ask orders
CREATE TABLE public.share_order_book (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_id UUID NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('buy', 'sell')),
  order_method TEXT NOT NULL DEFAULT 'market' CHECK (order_method IN ('market', 'limit')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_per_share NUMERIC NOT NULL CHECK (price_per_share > 0),
  market_price_at_order NUMERIC NOT NULL,
  price_tolerance_percent NUMERIC NOT NULL DEFAULT 0 CHECK (price_tolerance_percent BETWEEN -10 AND 10),
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled', 'expired')),
  filled_quantity INTEGER NOT NULL DEFAULT 0,
  remaining_quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create market price tolerance settings
CREATE TABLE public.market_price_tolerance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  max_buy_discount_percent NUMERIC NOT NULL DEFAULT 10 CHECK (max_buy_discount_percent >= 0),
  max_sell_premium_percent NUMERIC NOT NULL DEFAULT 10 CHECK (max_sell_premium_percent >= 0),
  order_expiry_hours INTEGER NOT NULL DEFAULT 24,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create share selling rules table
CREATE TABLE public.share_selling_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_type TEXT NOT NULL,
  daily_sell_limit NUMERIC NOT NULL DEFAULT 0,
  weekly_sell_limit NUMERIC NOT NULL DEFAULT 0,
  monthly_sell_limit NUMERIC NOT NULL DEFAULT 0,
  min_sell_amount NUMERIC NOT NULL DEFAULT 1,
  max_sell_amount NUMERIC NOT NULL DEFAULT 0,
  installment_allowed BOOLEAN NOT NULL DEFAULT false,
  min_installment_period_days INTEGER DEFAULT 30,
  max_installment_period_days INTEGER DEFAULT 365,
  min_down_payment_percent NUMERIC DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to dividend_declarations table
ALTER TABLE public.dividend_declarations 
ADD COLUMN IF NOT EXISTS cut_off_date DATE,
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS eligible_shareholders_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_eligible_shares INTEGER DEFAULT 0;

-- Add new columns to shares table for reserve management
ALTER TABLE public.shares 
ADD COLUMN IF NOT EXISTS reserve_rate_percent NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS reserve_allocated_shares INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reserve_issued_shares INTEGER DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.share_order_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_price_tolerance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_selling_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for share_order_book
CREATE POLICY "Users can view their own orders" ON public.share_order_book
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.share_order_book
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON public.share_order_book
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all orders" ON public.share_order_book
  FOR ALL USING (is_admin(auth.uid()));

-- RLS policies for market_price_tolerance_settings
CREATE POLICY "Admins can manage price tolerance settings" ON public.market_price_tolerance_settings
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view price tolerance settings" ON public.market_price_tolerance_settings
  FOR SELECT TO authenticated USING (true);

-- RLS policies for share_selling_rules
CREATE POLICY "Admins can manage selling rules" ON public.share_selling_rules
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view selling rules" ON public.share_selling_rules
  FOR SELECT TO authenticated USING (is_active = true);

-- Insert default market price tolerance settings
INSERT INTO public.market_price_tolerance_settings (
  max_buy_discount_percent,
  max_sell_premium_percent,
  order_expiry_hours,
  is_enabled
) VALUES (10, 10, 24, true)
ON CONFLICT DO NOTHING;

-- Insert default share selling rules for different account types
INSERT INTO public.share_selling_rules (
  account_type,
  daily_sell_limit,
  weekly_sell_limit,
  monthly_sell_limit,
  min_sell_amount,
  max_sell_amount,
  installment_allowed,
  min_installment_period_days,
  max_installment_period_days,
  min_down_payment_percent
) VALUES 
('individual', 100000, 500000, 2000000, 1, 0, true, 30, 365, 20),
('business', 500000, 2500000, 10000000, 1, 0, true, 30, 180, 30),
('organisation', 1000000, 5000000, 20000000, 1, 0, true, 30, 90, 50)
ON CONFLICT DO NOTHING;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_share_order_book_updated_at 
  BEFORE UPDATE ON public.share_order_book 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_price_tolerance_settings_updated_at 
  BEFORE UPDATE ON public.market_price_tolerance_settings 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_share_selling_rules_updated_at 
  BEFORE UPDATE ON public.share_selling_rules 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

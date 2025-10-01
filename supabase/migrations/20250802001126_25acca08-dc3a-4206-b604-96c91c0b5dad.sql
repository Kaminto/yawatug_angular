-- Create promotional campaigns table
CREATE TABLE public.promotional_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('discount', 'bonus_shares', 'cashback', 'referral_bonus', 'early_bird', 'loyalty_reward')),
  
  -- Discount specific fields
  discount_percentage NUMERIC,
  discount_amount NUMERIC,
  discount_currency TEXT DEFAULT 'UGX',
  
  -- Bonus/Royalty specific fields  
  bonus_shares_quantity INTEGER,
  bonus_amount NUMERIC,
  bonus_currency TEXT DEFAULT 'UGX',
  royalty_percentage NUMERIC,
  
  -- Campaign settings
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'new_users', 'existing_users', 'premium_users', 'inactive_users')),
  budget_amount NUMERIC,
  budget_currency TEXT DEFAULT 'UGX',
  
  -- Status and timing
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Usage tracking
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  
  -- Terms and conditions
  terms_and_conditions TEXT,
  promo_code TEXT UNIQUE,
  
  -- Metadata
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotional_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage promotional campaigns" 
ON public.promotional_campaigns 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active campaigns" 
ON public.promotional_campaigns 
FOR SELECT 
USING (is_active = true AND status = 'active');

-- Create campaign analytics table
CREATE TABLE public.campaign_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.promotional_campaigns(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Performance metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  cost_incurred NUMERIC DEFAULT 0,
  
  -- User engagement
  unique_users_reached INTEGER DEFAULT 0,
  repeat_users INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(campaign_id, metric_date)
);

-- Enable RLS for analytics
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaign analytics" 
ON public.campaign_analytics 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create campaign usage tracking table
CREATE TABLE public.campaign_user_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.promotional_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Usage details
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transaction_id UUID,
  benefit_applied JSONB,
  
  UNIQUE(campaign_id, user_id, transaction_id)
);

-- Enable RLS for usage tracking
ALTER TABLE public.campaign_user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view campaign usage" 
ON public.campaign_user_usage 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own campaign usage" 
ON public.campaign_user_usage 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create trigger for updating campaign usage count
CREATE OR REPLACE FUNCTION public.update_campaign_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.promotional_campaigns 
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_usage_trigger
  AFTER INSERT ON public.campaign_user_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_usage_count();

-- Insert sample promotional campaigns
INSERT INTO public.promotional_campaigns (
  name, title, description, campaign_type, discount_percentage, 
  target_audience, budget_amount, status, starts_at, ends_at,
  terms_and_conditions, priority
) VALUES 
(
  'new_user_discount', 
  'New Investor Welcome Offer', 
  'Get 10% discount on your first share purchase', 
  'discount', 
  10, 
  'new_users', 
  5000000, 
  'active',
  now(),
  now() + INTERVAL '3 months',
  'Valid for first-time investors only. Minimum investment of UGX 100,000 required.',
  5
),
(
  'bonus_shares_loyalty', 
  'Loyalty Bonus Shares', 
  'Receive 5 bonus shares for every 100 shares purchased', 
  'bonus_shares', 
  NULL,
  'existing_users', 
  2000000, 
  'active',
  now(),
  now() + INTERVAL '6 months',
  'Available for existing users with previous investments. Bonus shares credited within 48 hours.',
  3
),
(
  'early_bird_special', 
  'Early Bird Investment Bonus', 
  'Invest early and get 15% bonus amount on investments over UGX 500,000', 
  'cashback', 
  NULL,
  'all', 
  10000000, 
  'active',
  now(),
  now() + INTERVAL '1 month',
  'Minimum investment of UGX 500,000 required. Cashback paid within 7 business days.',
  8
);

-- Set the budget amounts with bonus amounts
UPDATE public.promotional_campaigns 
SET bonus_shares_quantity = 5 
WHERE name = 'bonus_shares_loyalty';

UPDATE public.promotional_campaigns 
SET bonus_amount = 75000, bonus_currency = 'UGX'
WHERE name = 'early_bird_special';
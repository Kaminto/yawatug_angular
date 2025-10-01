-- Create promotions table for managing different offers
CREATE TABLE public.promotions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    offer_details JSONB NOT NULL DEFAULT '{}',
    target_audience TEXT NOT NULL DEFAULT 'all', -- 'first_time', 'returning', 'premium', 'all', etc.
    promotion_type TEXT NOT NULL DEFAULT 'bonus', -- 'bonus', 'discount', 'exclusive_access', 'consultation', etc.
    value_amount NUMERIC,
    value_currency TEXT DEFAULT 'UGX',
    value_percentage NUMERIC,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1, -- Higher number = higher priority
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER, -- NULL for unlimited
    current_uses INTEGER DEFAULT 0,
    terms_and_conditions TEXT,
    promo_code TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Create policies for promotions
CREATE POLICY "Admins can manage promotions" 
ON public.promotions 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active promotions" 
ON public.promotions 
FOR SELECT 
USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (expires_at IS NULL OR expires_at > now()));

-- Create promotion usage tracking table
CREATE TABLE public.promotion_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT, -- For tracking anonymous users
    used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    transaction_id UUID, -- If linked to a specific transaction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

-- Enable RLS for promotion usage
ALTER TABLE public.promotion_usage ENABLE ROW LEVEL SECURITY;

-- Policies for promotion usage
CREATE POLICY "Admins can view all promotion usage" 
ON public.promotion_usage 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own promotion usage" 
ON public.promotion_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can record promotion usage" 
ON public.promotion_usage 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_promotions_target_audience ON public.promotions(target_audience);
CREATE INDEX idx_promotions_active_dates ON public.promotions(is_active, starts_at, expires_at);
CREATE INDEX idx_promotions_priority ON public.promotions(priority DESC);
CREATE INDEX idx_promotion_usage_promotion_id ON public.promotion_usage(promotion_id);
CREATE INDEX idx_promotion_usage_user_id ON public.promotion_usage(user_id);

-- Insert some sample promotions
INSERT INTO public.promotions (
    title, description, offer_details, target_audience, promotion_type, 
    value_percentage, priority, expires_at, terms_and_conditions
) VALUES 
(
    'First-Time Investor Bonus',
    '🎉 Welcome Package: Get 15% bonus on your first investment plus exclusive benefits worth over UGX 100,000!',
    '{
        "bonus_percentage": 15,
        "free_consultation": true,
        "fast_track_verification": true,
        "early_bird_pricing": true,
        "priority_app_access": true,
        "consultation_value": 50000,
        "total_package_value": 100000
    }',
    'first_time',
    'bonus',
    15,
    10,
    now() + INTERVAL '30 days',
    '• Valid for new investors only • Minimum investment UGX 100,000 • Bonus applied to first investment only • Cannot be combined with other offers • Consultation must be scheduled within 7 days'
),
(
    'Premium Investor Exclusive',
    '💎 VIP Treatment: Premium investors get 8% bonus, dedicated account manager, and quarterly profit reports',
    '{
        "bonus_percentage": 8,
        "dedicated_manager": true,
        "quarterly_reports": true,
        "priority_support": true,
        "exclusive_opportunities": true
    }',
    'premium',
    'exclusive_access',
    8,
    8,
    now() + INTERVAL '90 days',
    '• For investments above UGX 5,000,000 • Dedicated account manager assigned within 24 hours • Quarterly detailed profit analysis • Priority access to new mining opportunities'
),
(
    'Returning Investor Loyalty Bonus',
    '🏆 Welcome Back: 5% bonus for returning investors who haven\'t invested in the last 6 months',
    '{
        "bonus_percentage": 5,
        "loyalty_tier_upgrade": true,
        "fee_reduction": 50
    }',
    'returning',
    'bonus',
    5,
    6,
    now() + INTERVAL '60 days',
    '• Valid for investors inactive for 6+ months • Applies to investments above UGX 500,000 • 50% reduction in transaction fees • Automatic loyalty tier upgrade'
),
(
    'Mobile App Launch Special',
    '📱 App Exclusive: Download our new mobile app and get 3% bonus on all investments made through the app',
    '{
        "bonus_percentage": 3,
        "app_exclusive": true,
        "mobile_only": true,
        "push_notifications": true
    }',
    'all',
    'bonus',
    3,
    7,
    now() + INTERVAL '45 days',
    '• Available only through mobile app • Valid for all app users • Bonus applies to all investments made via app • Includes real-time push notifications'
);
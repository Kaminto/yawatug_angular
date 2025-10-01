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
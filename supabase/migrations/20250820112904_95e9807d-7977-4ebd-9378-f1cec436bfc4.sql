-- Phase 1: Share Pool Enhancement - Add share types and improve pricing integration

-- Add share types and categories to existing shares table
ALTER TABLE public.shares 
ADD COLUMN IF NOT EXISTS share_type text DEFAULT 'common' CHECK (share_type IN ('common', 'preferred', 'restricted', 'bonus', 'rights')),
ADD COLUMN IF NOT EXISTS share_category text DEFAULT 'general' CHECK (share_category IN ('general', 'vip', 'club', 'institutional', 'employee')),
ADD COLUMN IF NOT EXISTS minimum_investment numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS maximum_individual_holding numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS voting_rights boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS dividend_eligible boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS transfer_restrictions jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS price_calculation_method text DEFAULT 'dynamic' CHECK (price_calculation_method IN ('fixed', 'dynamic', 'market_driven')),
ADD COLUMN IF NOT EXISTS last_price_calculation_date timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pricing_metadata jsonb DEFAULT '{}';

-- Create enhanced share pool settings table for better pool management
CREATE TABLE IF NOT EXISTS public.share_pool_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    share_id uuid NOT NULL REFERENCES public.shares(id) ON DELETE CASCADE,
    auto_rebalance_enabled boolean DEFAULT false,
    low_stock_threshold_percent numeric DEFAULT 10.0,
    critical_stock_threshold_percent numeric DEFAULT 5.0,
    max_daily_sales_percent numeric DEFAULT 5.0,
    price_volatility_limit_percent numeric DEFAULT 10.0,
    reserve_allocation_strategy text DEFAULT 'percentage' CHECK (reserve_allocation_strategy IN ('percentage', 'fixed', 'dynamic')),
    reserve_percentage numeric DEFAULT 20.0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- Create share type configurations table for flexible share type management
CREATE TABLE IF NOT EXISTS public.share_type_configurations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    share_type text NOT NULL,
    share_category text NOT NULL,
    display_name text NOT NULL,
    description text,
    default_voting_rights boolean DEFAULT true,
    default_dividend_eligible boolean DEFAULT true,
    default_transfer_restrictions jsonb DEFAULT '{}',
    minimum_investment_multiplier numeric DEFAULT 1.0,
    maximum_holding_multiplier numeric DEFAULT NULL,
    priority_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(share_type, share_category)
);

-- Create enhanced pricing calculation log for better price tracking
CREATE TABLE IF NOT EXISTS public.enhanced_share_price_calculations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    share_id uuid NOT NULL REFERENCES public.shares(id) ON DELETE CASCADE,
    calculation_date timestamp with time zone DEFAULT now(),
    calculation_method text NOT NULL CHECK (calculation_method IN ('manual', 'auto_dynamic', 'market_activity', 'dividend_adjusted')),
    
    -- Price components
    previous_price numeric NOT NULL,
    base_price_adjustment numeric DEFAULT 0,
    mining_profit_factor numeric DEFAULT 0,
    dividend_impact_factor numeric DEFAULT 0,
    market_activity_factor numeric DEFAULT 0,
    supply_demand_factor numeric DEFAULT 0,
    volatility_adjustment numeric DEFAULT 0,
    
    -- Final calculation
    calculated_price numeric NOT NULL,
    approved_price numeric DEFAULT NULL,
    price_change_percent numeric GENERATED ALWAYS AS (
        CASE 
            WHEN previous_price > 0 THEN ((calculated_price - previous_price) / previous_price) * 100
            ELSE 0 
        END
    ) STORED,
    
    -- Metadata and tracking
    calculation_inputs jsonb DEFAULT '{}',
    admin_notes text,
    auto_applied boolean DEFAULT false,
    created_by uuid REFERENCES auth.users(id),
    approved_by uuid REFERENCES auth.users(id),
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Insert default share type configurations
INSERT INTO public.share_type_configurations (share_type, share_category, display_name, description, priority_order) VALUES
('common', 'general', 'Common Shares', 'Standard equity shares with voting rights and dividend eligibility', 1),
('common', 'vip', 'VIP Common Shares', 'Premium common shares with enhanced benefits', 2),
('common', 'club', 'Club Member Shares', 'Shares allocated to investment club members', 3),
('preferred', 'general', 'Preferred Shares', 'Priority shares with fixed dividends and liquidation preference', 4),
('restricted', 'employee', 'Employee Restricted Shares', 'Shares with transfer restrictions for employees', 5),
('bonus', 'general', 'Bonus Shares', 'Shares issued as bonuses or promotions', 6),
('rights', 'general', 'Rights Shares', 'Shares issued through rights offerings', 7)
ON CONFLICT (share_type, share_category) DO NOTHING;

-- Create function to update share pricing with enhanced calculation
CREATE OR REPLACE FUNCTION public.calculate_enhanced_share_price(
    p_share_id uuid,
    p_mining_profit_data jsonb DEFAULT '{}',
    p_dividend_data jsonb DEFAULT '{}',
    p_market_data jsonb DEFAULT '{}',
    p_manual_adjustment numeric DEFAULT 0,
    p_calculation_method text DEFAULT 'auto_dynamic'
) RETURNS uuid AS $$
DECLARE
    current_share RECORD;
    pricing_settings RECORD;
    calculation_id uuid;
    
    -- Price factors
    base_price numeric;
    mining_factor numeric := 0;
    dividend_factor numeric := 0;
    market_factor numeric := 0;
    supply_demand_factor numeric := 0;
    volatility_factor numeric := 0;
    
    -- Final price
    calculated_price numeric;
    max_change_percent numeric := 10; -- Default 10% max change
BEGIN
    -- Get current share data
    SELECT * INTO current_share FROM public.shares WHERE id = p_share_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Share not found';
    END IF;
    
    -- Get pricing settings
    SELECT * INTO pricing_settings FROM public.admin_dynamic_pricing_settings 
    WHERE is_enabled = true ORDER BY created_at DESC LIMIT 1;
    
    base_price := current_share.price_per_share;
    
    -- Calculate mining profit factor
    IF p_mining_profit_data ? 'profit_per_share' THEN
        mining_factor := (p_mining_profit_data->>'profit_per_share')::numeric * 
                        COALESCE(pricing_settings.mining_profit_weight, 1.0);
    END IF;
    
    -- Calculate dividend factor
    IF p_dividend_data ? 'dividend_impact' THEN
        dividend_factor := (p_dividend_data->>'dividend_impact')::numeric * 
                          COALESCE(pricing_settings.dividend_weight, 1.0);
    END IF;
    
    -- Calculate market activity factor
    IF p_market_data ? 'activity_score' THEN
        market_factor := (p_market_data->>'activity_score')::numeric * 
                        COALESCE(pricing_settings.market_activity_weight, 0.02);
    END IF;
    
    -- Calculate supply/demand factor based on available shares
    supply_demand_factor := CASE 
        WHEN current_share.available_shares::numeric / current_share.total_shares < 0.1 THEN 0.5 -- High demand
        WHEN current_share.available_shares::numeric / current_share.total_shares > 0.8 THEN -0.3 -- Low demand
        ELSE 0
    END;
    
    -- Calculate new price
    calculated_price := base_price + mining_factor + dividend_factor + market_factor + 
                       supply_demand_factor + p_manual_adjustment;
    
    -- Apply volatility limits
    IF pricing_settings IS NOT NULL THEN
        max_change_percent := LEAST(pricing_settings.price_volatility_limit, 15); -- Max 15%
    END IF;
    
    calculated_price := GREATEST(
        calculated_price,
        base_price * (1 - max_change_percent / 100)
    );
    calculated_price := LEAST(
        calculated_price,
        base_price * (1 + max_change_percent / 100)
    );
    
    -- Apply minimum price floor
    calculated_price := GREATEST(
        calculated_price, 
        COALESCE(pricing_settings.minimum_price_floor, 10000)
    );
    
    -- Log the calculation
    INSERT INTO public.enhanced_share_price_calculations (
        share_id,
        calculation_method,
        previous_price,
        base_price_adjustment,
        mining_profit_factor,
        dividend_impact_factor,
        market_activity_factor,
        supply_demand_factor,
        volatility_adjustment,
        calculated_price,
        calculation_inputs
    ) VALUES (
        p_share_id,
        p_calculation_method,
        base_price,
        p_manual_adjustment,
        mining_factor,
        dividend_factor,
        market_factor,
        supply_demand_factor,
        volatility_factor,
        calculated_price,
        jsonb_build_object(
            'mining_data', p_mining_profit_data,
            'dividend_data', p_dividend_data,
            'market_data', p_market_data,
            'timestamp', now()
        )
    ) RETURNING id INTO calculation_id;
    
    RETURN calculation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update share pool settings timestamp
CREATE OR REPLACE FUNCTION public.update_share_pool_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_share_pool_settings_updated_at
    BEFORE UPDATE ON public.share_pool_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_share_pool_settings_timestamp();

-- Create trigger to update share type configurations timestamp  
CREATE TRIGGER update_share_type_configurations_updated_at
    BEFORE UPDATE ON public.share_type_configurations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Enable RLS on new tables
ALTER TABLE public.share_pool_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_type_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_share_price_calculations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for share_pool_settings
CREATE POLICY "Admins can manage share pool settings" ON public.share_pool_settings
    FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active share pool settings" ON public.share_pool_settings
    FOR SELECT USING (true);

-- RLS Policies for share_type_configurations  
CREATE POLICY "Admins can manage share type configurations" ON public.share_type_configurations
    FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active share type configurations" ON public.share_type_configurations
    FOR SELECT USING (is_active = true);

-- RLS Policies for enhanced_share_price_calculations
CREATE POLICY "Admins can manage price calculations" ON public.enhanced_share_price_calculations
    FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view approved price calculations" ON public.enhanced_share_price_calculations
    FOR SELECT USING (approved_price IS NOT NULL OR is_admin(auth.uid()));

-- Insert default share pool settings for existing shares
INSERT INTO public.share_pool_settings (share_id, auto_rebalance_enabled, low_stock_threshold_percent, critical_stock_threshold_percent)
SELECT id, false, 10.0, 5.0 FROM public.shares
ON CONFLICT DO NOTHING;
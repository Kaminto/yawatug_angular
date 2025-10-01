-- Create club share allocations table
CREATE TABLE IF NOT EXISTS club_share_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    club_member_id uuid REFERENCES investment_club_members(id) NOT NULL,
    allocated_shares integer NOT NULL,
    transfer_fee_paid numeric NOT NULL DEFAULT 0,
    debt_amount_settled numeric NOT NULL DEFAULT 0,
    allocation_status text NOT NULL DEFAULT 'pending' CHECK (allocation_status IN ('pending', 'accepted', 'rejected', 'released_partially', 'released_fully')),
    consent_deadline timestamp with time zone NOT NULL DEFAULT (now() + INTERVAL '90 days'),
    consent_signed_at timestamp with time zone,
    rejection_reason text,
    rejection_count integer DEFAULT 0,
    last_rejection_at timestamp with time zone,
    can_reapply_after timestamp with time zone,
    admin_release_percentage numeric DEFAULT 0 CHECK (admin_release_percentage >= 0 AND admin_release_percentage <= 100),
    phased_release_schedule jsonb DEFAULT '[]'::jsonb,
    import_batch_reference text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create club share holding account table
CREATE TABLE IF NOT EXISTS club_share_holding_account (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    club_member_id uuid REFERENCES investment_club_members(id) NOT NULL,
    club_allocation_id uuid REFERENCES club_share_allocations(id) NOT NULL,
    shares_quantity integer NOT NULL,
    shares_released integer DEFAULT 0,
    shares_remaining integer GENERATED ALWAYS AS (shares_quantity - shares_released) STORED,
    status text NOT NULL DEFAULT 'holding' CHECK (status IN ('holding', 'partially_released', 'fully_released')),
    expected_release_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create club share release log table
CREATE TABLE IF NOT EXISTS club_share_release_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    club_allocation_id uuid REFERENCES club_share_allocations(id) NOT NULL,
    club_holding_account_id uuid REFERENCES club_share_holding_account(id) NOT NULL,
    shares_released integer NOT NULL,
    release_percentage numeric NOT NULL,
    release_trigger text NOT NULL CHECK (release_trigger IN ('manual_admin', 'automatic_ratio', 'referral_bonus', 'bulk_release')),
    released_by_admin uuid REFERENCES profiles(id),
    release_reason text,
    market_ratio_data jsonb,
    user_share_holding_id uuid,
    released_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Create club transfer fee settings table
CREATE TABLE IF NOT EXISTS club_transfer_fee_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_type text NOT NULL DEFAULT 'percentage' CHECK (fee_type IN ('percentage', 'flat_rate', 'percentage_plus_flat')),
    percentage_rate numeric DEFAULT 2.5,
    flat_fee_amount numeric DEFAULT 0,
    minimum_fee numeric DEFAULT 0,
    maximum_fee numeric,
    currency text NOT NULL DEFAULT 'UGX',
    is_active boolean DEFAULT true,
    applies_to text NOT NULL DEFAULT 'post_conversion' CHECK (applies_to IN ('import_legacy', 'post_conversion', 'both')),
    created_by uuid REFERENCES profiles(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create club release criteria settings table
CREATE TABLE IF NOT EXISTS club_release_criteria_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    criteria_type text NOT NULL DEFAULT 'sales_ratio' CHECK (criteria_type IN ('sales_ratio', 'buyback_funds', 'time_based', 'manual_only')),
    sales_ratio_threshold numeric DEFAULT 0.25, -- 25% of sales triggers release
    total_shares_for_sale integer NOT NULL DEFAULT 800000,
    minimum_sales_volume integer DEFAULT 50000,
    buyback_fund_threshold numeric DEFAULT 1000000,
    time_based_schedule jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES profiles(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE club_share_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_share_holding_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_share_release_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_transfer_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_release_criteria_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for club_share_allocations
CREATE POLICY "Admins can manage club share allocations" 
ON club_share_allocations FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Club members can view their own allocations" 
ON club_share_allocations FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM investment_club_members cm 
    WHERE cm.id = club_share_allocations.club_member_id 
    AND cm.user_id = auth.uid()
));

CREATE POLICY "Club members can update their consent status" 
ON club_share_allocations FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM investment_club_members cm 
    WHERE cm.id = club_share_allocations.club_member_id 
    AND cm.user_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM investment_club_members cm 
    WHERE cm.id = club_share_allocations.club_member_id 
    AND cm.user_id = auth.uid()
));

-- Create policies for club_share_holding_account
CREATE POLICY "Admins can manage club holding accounts" 
ON club_share_holding_account FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Club members can view their holding account" 
ON club_share_holding_account FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM investment_club_members cm 
    WHERE cm.id = club_share_holding_account.club_member_id 
    AND cm.user_id = auth.uid()
));

-- Create policies for club_share_release_log
CREATE POLICY "Admins can manage release logs" 
ON club_share_release_log FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Club members can view their release history" 
ON club_share_release_log FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM club_share_allocations csa
    JOIN investment_club_members cm ON cm.id = csa.club_member_id
    WHERE csa.id = club_share_release_log.club_allocation_id 
    AND cm.user_id = auth.uid()
));

-- Create policies for settings tables
CREATE POLICY "Admins can manage transfer fee settings" 
ON club_transfer_fee_settings FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active transfer fee settings" 
ON club_transfer_fee_settings FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage release criteria settings" 
ON club_release_criteria_settings FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active release criteria" 
ON club_release_criteria_settings FOR SELECT 
USING (is_active = true);

-- Create update timestamp triggers
CREATE OR REPLACE FUNCTION update_club_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_club_share_allocations_timestamp
    BEFORE UPDATE ON club_share_allocations
    FOR EACH ROW EXECUTE FUNCTION update_club_timestamp();

CREATE TRIGGER update_club_holding_account_timestamp
    BEFORE UPDATE ON club_share_holding_account
    FOR EACH ROW EXECUTE FUNCTION update_club_timestamp();

CREATE TRIGGER update_club_transfer_fee_settings_timestamp
    BEFORE UPDATE ON club_transfer_fee_settings
    FOR EACH ROW EXECUTE FUNCTION update_club_timestamp();

CREATE TRIGGER update_club_release_criteria_settings_timestamp
    BEFORE UPDATE ON club_release_criteria_settings
    FOR EACH ROW EXECUTE FUNCTION update_club_timestamp();

-- Insert default settings
INSERT INTO club_transfer_fee_settings (
    fee_type, percentage_rate, flat_fee_amount, currency, applies_to, created_by
) VALUES (
    'percentage', 2.5, 0, 'UGX', 'post_conversion', null
);

INSERT INTO club_release_criteria_settings (
    criteria_type, sales_ratio_threshold, total_shares_for_sale, minimum_sales_volume, created_by
) VALUES (
    'sales_ratio', 0.25, 800000, 50000, null
);
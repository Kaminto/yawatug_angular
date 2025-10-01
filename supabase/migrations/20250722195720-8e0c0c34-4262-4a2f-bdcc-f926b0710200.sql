-- Enhanced Mining Projects System with Funding Stages and Performance Monitoring

-- Create mining projects table
CREATE TABLE IF NOT EXISTS mining_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    project_type TEXT NOT NULL DEFAULT 'gold_mining' CHECK (project_type IN ('gold_mining', 'copper_mining', 'coltan_mining', 'diamond_mining', 'other')),
    target_funding NUMERIC NOT NULL,
    current_funding NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'UGX',
    expected_monthly_returns NUMERIC NOT NULL,
    expected_start_date DATE NOT NULL,
    expected_completion_date DATE,
    actual_start_date DATE,
    actual_completion_date DATE,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'evaluation', 'approved', 'funding', 'active', 'completed', 'suspended', 'cancelled')),
    viability_score NUMERIC CHECK (viability_score >= 0 AND viability_score <= 100),
    risk_assessment TEXT,
    environmental_clearance BOOLEAN DEFAULT false,
    government_approval BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB
);

-- Create project funding stages table
CREATE TABLE IF NOT EXISTS project_funding_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES mining_projects(id) ON DELETE CASCADE NOT NULL,
    stage_number INTEGER NOT NULL,
    stage_name TEXT NOT NULL,
    stage_amount NUMERIC NOT NULL,
    stage_description TEXT,
    target_completion_date DATE,
    actual_completion_date DATE,
    funding_status TEXT DEFAULT 'pending' CHECK (funding_status IN ('pending', 'approved', 'funded', 'disbursed', 'completed')),
    disbursement_date TIMESTAMP WITH TIME ZONE,
    disbursed_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(project_id, stage_number)
);

-- Create project performance tracking table
CREATE TABLE IF NOT EXISTS project_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES mining_projects(id) ON DELETE CASCADE NOT NULL,
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    actual_returns NUMERIC DEFAULT 0,
    expected_returns NUMERIC NOT NULL,
    variance_percentage NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN expected_returns > 0 THEN ((actual_returns - expected_returns) / expected_returns * 100)
            ELSE 0
        END
    ) STORED,
    production_volume NUMERIC,
    operational_costs NUMERIC,
    revenue NUMERIC,
    profit_margin NUMERIC,
    notes TEXT,
    reported_by UUID REFERENCES profiles(id),
    verified_by UUID REFERENCES profiles(id),
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'disputed', 'revised')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(project_id, reporting_period_start, reporting_period_end)
);

-- Create project investors table
CREATE TABLE IF NOT EXISTS project_investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES mining_projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    investment_amount NUMERIC NOT NULL,
    investment_percentage NUMERIC,
    investment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    investment_status TEXT DEFAULT 'active' CHECK (investment_status IN ('active', 'withdrawn', 'transferred')),
    returns_received NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create project returns distribution table
CREATE TABLE IF NOT EXISTS project_returns_distribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES mining_projects(id) ON DELETE CASCADE NOT NULL,
    performance_period_id UUID REFERENCES project_performance(id) ON DELETE CASCADE NOT NULL,
    total_returns_amount NUMERIC NOT NULL,
    admin_dividend_allocation NUMERIC DEFAULT 0,
    investor_distribution_amount NUMERIC DEFAULT 0,
    distribution_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    distribution_status TEXT DEFAULT 'pending' CHECK (distribution_status IN ('pending', 'calculated', 'approved', 'distributed', 'completed')),
    processed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create individual investor returns table
CREATE TABLE IF NOT EXISTS investor_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribution_id UUID REFERENCES project_returns_distribution(id) ON DELETE CASCADE NOT NULL,
    investor_id UUID REFERENCES project_investors(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    return_amount NUMERIC NOT NULL,
    investment_percentage NUMERIC NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'paid', 'failed')),
    payment_date TIMESTAMP WITH TIME ZONE,
    transaction_id UUID REFERENCES transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create project funding disbursement function
CREATE OR REPLACE FUNCTION disburse_project_funding(
    p_stage_id UUID,
    p_disbursement_amount NUMERIC,
    p_disbursed_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stage_record RECORD;
    project_record RECORD;
    project_fund_wallet_id UUID;
    available_balance NUMERIC;
    result JSONB;
BEGIN
    -- Get stage and project details
    SELECT pfs.*, mp.name as project_name
    INTO stage_record
    FROM project_funding_stages pfs
    JOIN mining_projects mp ON pfs.project_id = mp.id
    WHERE pfs.id = p_stage_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Funding stage not found');
    END IF;
    
    -- Get project funding wallet
    SELECT id, balance INTO project_fund_wallet_id, available_balance
    FROM admin_sub_wallets
    WHERE wallet_type = 'project_funding' AND currency = 'UGX'
    LIMIT 1;
    
    IF project_fund_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Project funding wallet not found');
    END IF;
    
    IF available_balance < p_disbursement_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds in project funding wallet');
    END IF;
    
    -- Deduct from project funding wallet
    UPDATE admin_sub_wallets
    SET balance = balance - p_disbursement_amount,
        updated_at = now()
    WHERE id = project_fund_wallet_id;
    
    -- Update funding stage
    UPDATE project_funding_stages
    SET disbursed_amount = disbursed_amount + p_disbursement_amount,
        disbursement_date = now(),
        funding_status = CASE 
            WHEN (disbursed_amount + p_disbursement_amount) >= stage_amount THEN 'completed'
            ELSE 'disbursed'
        END,
        updated_at = now()
    WHERE id = p_stage_id;
    
    -- Update project current funding
    UPDATE mining_projects
    SET current_funding = current_funding + p_disbursement_amount,
        updated_at = now()
    WHERE id = stage_record.project_id;
    
    -- Record fund transfer
    INSERT INTO admin_wallet_fund_transfers (
        from_wallet_id, amount, currency, transfer_type, description, reference, created_by
    ) VALUES (
        project_fund_wallet_id, p_disbursement_amount, 'UGX', 'project_disbursement',
        'Project funding disbursement for ' || stage_record.project_name || ' - Stage ' || stage_record.stage_number,
        'PROJECT-' || stage_record.project_id || '-STAGE-' || stage_record.stage_number,
        p_disbursed_by
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'disbursed_amount', p_disbursement_amount,
        'remaining_wallet_balance', available_balance - p_disbursement_amount,
        'stage_status', CASE 
            WHEN (stage_record.disbursed_amount + p_disbursement_amount) >= stage_record.stage_amount THEN 'completed'
            ELSE 'disbursed'
        END
    );
END;
$$;

-- Create function to process project returns and distribute to dividends
CREATE OR REPLACE FUNCTION process_project_returns(
    p_project_id UUID,
    p_actual_returns NUMERIC,
    p_reporting_period_start DATE,
    p_reporting_period_end DATE,
    p_reported_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    performance_id UUID;
    distribution_id UUID;
    admin_dividend_wallet_id UUID;
    project_record RECORD;
    expected_returns NUMERIC;
    dividend_amount NUMERIC;
    result JSONB;
BEGIN
    -- Get project details
    SELECT * INTO project_record
    FROM mining_projects
    WHERE id = p_project_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Project not found');
    END IF;
    
    -- Calculate expected returns for the period (assuming monthly returns)
    expected_returns := project_record.expected_monthly_returns;
    
    -- Insert performance record
    INSERT INTO project_performance (
        project_id, reporting_period_start, reporting_period_end,
        actual_returns, expected_returns, production_volume,
        revenue, reported_by, verification_status
    ) VALUES (
        p_project_id, p_reporting_period_start, p_reporting_period_end,
        p_actual_returns, expected_returns, 0,
        p_actual_returns, p_reported_by, 'verified'
    ) RETURNING id INTO performance_id;
    
    -- Calculate dividend allocation (70% to dividends, 30% retained for operations)
    dividend_amount := p_actual_returns * 0.70;
    
    -- Get admin dividend wallet
    SELECT id INTO admin_dividend_wallet_id
    FROM admin_sub_wallets
    WHERE wallet_type = 'admin_fund' AND currency = 'UGX'
    LIMIT 1;
    
    IF admin_dividend_wallet_id IS NOT NULL AND dividend_amount > 0 THEN
        -- Credit dividend wallet
        UPDATE admin_sub_wallets
        SET balance = balance + dividend_amount,
            updated_at = now()
        WHERE id = admin_dividend_wallet_id;
        
        -- Record returns distribution
        INSERT INTO project_returns_distribution (
            project_id, performance_period_id, total_returns_amount,
            admin_dividend_allocation, distribution_status, processed_by
        ) VALUES (
            p_project_id, performance_id, p_actual_returns,
            dividend_amount, 'distributed', p_reported_by
        ) RETURNING id INTO distribution_id;
        
        -- Record fund transfer
        INSERT INTO admin_wallet_fund_transfers (
            to_wallet_id, amount, currency, transfer_type, description, reference, created_by
        ) VALUES (
            admin_dividend_wallet_id, dividend_amount, 'UGX', 'project_returns',
            'Project returns allocation from ' || project_record.name || ' for period ' || p_reporting_period_start || ' to ' || p_reporting_period_end,
            'PROJECT-RETURNS-' || p_project_id || '-' || p_reporting_period_start,
            p_reported_by
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'performance_id', performance_id,
        'distribution_id', distribution_id,
        'actual_returns', p_actual_returns,
        'expected_returns', expected_returns,
        'variance_percentage', 
            CASE 
                WHEN expected_returns > 0 THEN ((p_actual_returns - expected_returns) / expected_returns * 100)
                ELSE 0
            END,
        'dividend_allocation', dividend_amount
    );
END;
$$;

-- Create function to calculate project funding progress
CREATE OR REPLACE FUNCTION get_project_funding_summary(p_project_id UUID)
RETURNS TABLE(
    project_name TEXT,
    target_funding NUMERIC,
    current_funding NUMERIC,
    funding_percentage NUMERIC,
    total_stages INTEGER,
    completed_stages INTEGER,
    pending_stages INTEGER,
    total_disbursed NUMERIC,
    next_stage_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH stage_summary AS (
        SELECT 
            COUNT(*) as total_stages,
            COUNT(CASE WHEN funding_status = 'completed' THEN 1 END) as completed_stages,
            COUNT(CASE WHEN funding_status IN ('pending', 'approved') THEN 1 END) as pending_stages,
            COALESCE(SUM(disbursed_amount), 0) as total_disbursed,
            COALESCE(MIN(CASE WHEN funding_status IN ('pending', 'approved') THEN stage_amount END), 0) as next_stage_amount
        FROM project_funding_stages
        WHERE project_id = p_project_id
    )
    SELECT 
        mp.name,
        mp.target_funding,
        mp.current_funding,
        CASE 
            WHEN mp.target_funding > 0 THEN (mp.current_funding / mp.target_funding * 100)
            ELSE 0
        END as funding_percentage,
        ss.total_stages::INTEGER,
        ss.completed_stages::INTEGER,
        ss.pending_stages::INTEGER,
        ss.total_disbursed,
        ss.next_stage_amount
    FROM mining_projects mp
    CROSS JOIN stage_summary ss
    WHERE mp.id = p_project_id;
END;
$$;

-- Enable RLS on new tables
ALTER TABLE mining_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_funding_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_returns_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_returns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view approved projects"
    ON mining_projects FOR SELECT
    USING (status IN ('approved', 'funding', 'active', 'completed'));

CREATE POLICY "Admins can manage all projects"
    ON mining_projects FOR ALL
    USING (is_admin(auth.uid()));

CREATE POLICY "Project creators can update their projects"
    ON mining_projects FOR UPDATE
    USING (created_by = auth.uid() AND status = 'planning');

CREATE POLICY "Anyone can view project funding stages"
    ON project_funding_stages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM mining_projects mp 
        WHERE mp.id = project_funding_stages.project_id 
        AND mp.status IN ('approved', 'funding', 'active', 'completed')
    ));

CREATE POLICY "Admins can manage funding stages"
    ON project_funding_stages FOR ALL
    USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view project performance"
    ON project_performance FOR SELECT
    USING (verification_status = 'verified');

CREATE POLICY "Admins can manage project performance"
    ON project_performance FOR ALL
    USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their investments"
    ON project_investors FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can create their own investments"
    ON project_investors FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all returns distributions"
    ON project_returns_distribution FOR SELECT
    USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their investor returns"
    ON investor_returns FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mining_projects_status ON mining_projects(status);
CREATE INDEX IF NOT EXISTS idx_mining_projects_created_by ON mining_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_funding_stages_project_id ON project_funding_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_performance_project_id ON project_performance(project_id);
CREATE INDEX IF NOT EXISTS idx_project_performance_period ON project_performance(reporting_period_start, reporting_period_end);
CREATE INDEX IF NOT EXISTS idx_project_investors_project_id ON project_investors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_investors_user_id ON project_investors(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_returns_user_id ON investor_returns(user_id);

-- Insert sample project (Moyo Gold Project)
INSERT INTO mining_projects (
    name, description, location, project_type, target_funding, expected_monthly_returns,
    expected_start_date, expected_completion_date, status, viability_score,
    environmental_clearance, government_approval
) VALUES (
    'Moyo Gold Mining Project',
    'Large-scale gold mining operation in Moyo district with proven reserves of 5.2 million ounces. Expected to generate substantial returns through modern extraction techniques and sustainable mining practices.',
    'Moyo District, Northern Uganda',
    'gold_mining',
    3000000000,
    100000000,
    '2025-12-01',
    '2030-12-31',
    'approved',
    85.5,
    true,
    true
);

-- Get the project ID for sample data
DO $$
DECLARE
    project_id UUID;
BEGIN
    SELECT id INTO project_id FROM mining_projects WHERE name = 'Moyo Gold Mining Project' LIMIT 1;
    
    -- Insert funding stages for Moyo Gold Project
    INSERT INTO project_funding_stages (project_id, stage_number, stage_name, stage_amount, stage_description, target_completion_date, funding_status) VALUES
    (project_id, 1, 'Site Preparation & Infrastructure', 500000000, 'Land acquisition, access roads, basic infrastructure setup', '2025-06-01', 'approved'),
    (project_id, 2, 'Equipment Procurement', 800000000, 'Mining equipment, processing machinery, vehicles', '2025-09-01', 'approved'),
    (project_id, 3, 'Operational Setup', 700000000, 'Staff hiring, training, operational systems', '2025-11-01', 'pending'),
    (project_id, 4, 'Production Commencement', 600000000, 'Initial production setup, working capital', '2025-12-01', 'pending'),
    (project_id, 5, 'Expansion & Optimization', 400000000, 'Production scaling, efficiency improvements', '2026-06-01', 'pending');
END $$;
-- Enhanced Mining Projects System with Funding Stages and Performance Monitoring - CORRECTED

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

-- Insert sample project (Moyo Gold Project) first
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
)
ON CONFLICT (name) DO NOTHING;

-- Insert funding stages for Moyo Gold Project (using subquery to get project_id)
INSERT INTO project_funding_stages (project_id, stage_number, stage_name, stage_amount, stage_description, target_completion_date, funding_status) 
SELECT 
    mp.id,
    stage_info.stage_number,
    stage_info.stage_name,
    stage_info.stage_amount,
    stage_info.stage_description,
    stage_info.target_completion_date,
    stage_info.funding_status
FROM mining_projects mp
CROSS JOIN (
    VALUES 
    (1, 'Site Preparation & Infrastructure', 500000000, 'Land acquisition, access roads, basic infrastructure setup', '2025-06-01'::date, 'approved'),
    (2, 'Equipment Procurement', 800000000, 'Mining equipment, processing machinery, vehicles', '2025-09-01'::date, 'approved'),
    (3, 'Operational Setup', 700000000, 'Staff hiring, training, operational systems', '2025-11-01'::date, 'pending'),
    (4, 'Production Commencement', 600000000, 'Initial production setup, working capital', '2025-12-01'::date, 'pending'),
    (5, 'Expansion & Optimization', 400000000, 'Production scaling, efficiency improvements', '2026-06-01'::date, 'pending')
) AS stage_info(stage_number, stage_name, stage_amount, stage_description, target_completion_date, funding_status)
WHERE mp.name = 'Moyo Gold Mining Project'
ON CONFLICT (project_id, stage_number) DO NOTHING;
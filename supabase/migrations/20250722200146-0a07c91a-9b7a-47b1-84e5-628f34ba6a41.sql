-- Create basic mining projects tables first

-- Create mining projects table
CREATE TABLE IF NOT EXISTS mining_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    project_type TEXT NOT NULL DEFAULT 'gold_mining',
    target_funding NUMERIC NOT NULL,
    current_funding NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'UGX',
    expected_monthly_returns NUMERIC NOT NULL,
    expected_start_date DATE NOT NULL,
    expected_completion_date DATE,
    actual_start_date DATE,
    actual_completion_date DATE,
    status TEXT DEFAULT 'planning',
    viability_score NUMERIC,
    risk_assessment TEXT,
    environmental_clearance BOOLEAN DEFAULT false,
    government_approval BOOLEAN DEFAULT false,
    created_by UUID,
    approved_by UUID,
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
    funding_status TEXT DEFAULT 'pending',
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
    variance_percentage NUMERIC,
    production_volume NUMERIC,
    operational_costs NUMERIC,
    revenue NUMERIC,
    profit_margin NUMERIC,
    notes TEXT,
    reported_by UUID,
    verified_by UUID,
    verification_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(project_id, reporting_period_start, reporting_period_end)
);

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
)
ON CONFLICT (name) DO NOTHING;
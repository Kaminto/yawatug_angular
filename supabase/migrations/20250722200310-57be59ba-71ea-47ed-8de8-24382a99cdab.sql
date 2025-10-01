-- Add missing columns to existing mining_projects table
ALTER TABLE mining_projects 
ADD COLUMN IF NOT EXISTS expected_monthly_returns NUMERIC,
ADD COLUMN IF NOT EXISTS expected_start_date DATE,
ADD COLUMN IF NOT EXISTS expected_completion_date DATE,
ADD COLUMN IF NOT EXISTS actual_start_date DATE,
ADD COLUMN IF NOT EXISTS actual_completion_date DATE,
ADD COLUMN IF NOT EXISTS viability_score NUMERIC,
ADD COLUMN IF NOT EXISTS risk_assessment TEXT,
ADD COLUMN IF NOT EXISTS environmental_clearance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS government_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Update the sample project with new data
UPDATE mining_projects 
SET 
    expected_monthly_returns = 100000000,
    expected_start_date = '2025-12-01',
    expected_completion_date = '2030-12-31',
    viability_score = 85.5,
    environmental_clearance = true,
    government_approval = true
WHERE name = 'Moyo Gold Mining Project';

-- Insert sample project if it doesn't exist
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

-- Insert funding stages for Moyo Gold Project
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
-- Fix mining_projects status constraint - replace with correct values
ALTER TABLE mining_projects DROP CONSTRAINT IF EXISTS mining_projects_status_check;
ALTER TABLE mining_projects 
ADD CONSTRAINT mining_projects_status_check 
CHECK (status IN ('draft', 'planning', 'pending_approval', 'approved', 'active', 'completed', 'suspended', 'cancelled'));
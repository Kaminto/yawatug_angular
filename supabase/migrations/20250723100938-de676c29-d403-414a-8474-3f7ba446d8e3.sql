-- Fix agent_applications foreign key relationship
ALTER TABLE agent_applications 
ADD CONSTRAINT agent_applications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix agents foreign key relationship  
ALTER TABLE agents 
ADD CONSTRAINT agents_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix agent_commissions foreign key relationship
ALTER TABLE agent_commissions 
ADD CONSTRAINT agent_commissions_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

-- Check and fix mining_projects status constraint
ALTER TABLE mining_projects DROP CONSTRAINT IF EXISTS mining_projects_status_check;
ALTER TABLE mining_projects 
ADD CONSTRAINT mining_projects_status_check 
CHECK (status IN ('planning', 'pending_approval', 'approved', 'active', 'completed', 'suspended', 'cancelled'));
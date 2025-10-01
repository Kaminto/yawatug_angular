-- Fix the relationship issues for agent_applications and mining_projects

-- First, fix the agent_applications table structure
-- Check if the user_id column references the correct table
DO $$
BEGIN
  -- Drop the existing foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'agent_applications_user_id_fkey'
    AND table_name = 'agent_applications'
  ) THEN
    ALTER TABLE agent_applications DROP CONSTRAINT agent_applications_user_id_fkey;
  END IF;
  
  -- Add the correct foreign key constraint
  ALTER TABLE agent_applications 
  ADD CONSTRAINT agent_applications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;

-- Fix the agents table relationship
DO $$
BEGIN
  -- Drop the existing foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'agents_user_id_fkey'
    AND table_name = 'agents'
  ) THEN
    ALTER TABLE agents DROP CONSTRAINT agents_user_id_fkey;
  END IF;
  
  -- Add the correct foreign key constraint
  ALTER TABLE agents 
  ADD CONSTRAINT agents_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;

-- Fix the agent_commissions table relationship
DO $$
BEGIN
  -- Drop the existing foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'agent_commissions_agent_id_fkey'
    AND table_name = 'agent_commissions'
  ) THEN
    ALTER TABLE agent_commissions DROP CONSTRAINT agent_commissions_agent_id_fkey;
  END IF;
  
  -- Add the correct foreign key constraint
  ALTER TABLE agent_commissions 
  ADD CONSTRAINT agent_commissions_agent_id_fkey 
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
END $$;

-- Fix mining_projects status constraint with all the correct values
ALTER TABLE mining_projects DROP CONSTRAINT IF EXISTS mining_projects_status_check;
ALTER TABLE mining_projects 
ADD CONSTRAINT mining_projects_status_check 
CHECK (status IN ('draft', 'planning', 'pending_approval', 'approved', 'active', 'completed', 'suspended', 'cancelled'));

-- Update any invalid status values to 'draft' to prevent constraint violations
UPDATE mining_projects 
SET status = 'draft' 
WHERE status NOT IN ('draft', 'planning', 'pending_approval', 'approved', 'active', 'completed', 'suspended', 'cancelled');

-- Ensure we have a profiles table with proper structure if needed
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  user_role text DEFAULT 'user',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policy for profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;
-- Fix RLS policies for mining_projects table
ALTER TABLE public.mining_projects ENABLE ROW LEVEL SECURITY;

-- Allow admins to create, read, update mining projects
CREATE POLICY "Admins can manage mining projects" ON public.mining_projects
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

-- Allow users to view approved/active projects
CREATE POLICY "Users can view active projects" ON public.mining_projects
FOR SELECT USING (status IN ('active', 'approved', 'completed'));

-- Fix missing RLS policies for other tables with RLS enabled but no policies
-- mining_project_funding_stages
ALTER TABLE public.mining_project_funding_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project funding stages" ON public.mining_project_funding_stages
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

CREATE POLICY "Users can view project funding stages" ON public.mining_project_funding_stages
FOR SELECT USING (true);

-- mining_project_performance
ALTER TABLE public.mining_project_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project performance" ON public.mining_project_performance
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

CREATE POLICY "Users can view project performance" ON public.mining_project_performance
FOR SELECT USING (true);

-- mining_project_updates
ALTER TABLE public.mining_project_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project updates" ON public.mining_project_updates
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

CREATE POLICY "Users can view project updates" ON public.mining_project_updates
FOR SELECT USING (true);
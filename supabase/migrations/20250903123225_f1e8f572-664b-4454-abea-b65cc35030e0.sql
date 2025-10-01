-- Fix missing RLS policies for specific tables that don't have them yet

-- Check if admin_notification_settings needs policies
CREATE POLICY "Admins can manage notification settings" ON public.admin_notification_settings
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Check if admin_dashboard_metrics needs policies  
CREATE POLICY "Admins can view dashboard metrics" ON public.admin_dashboard_metrics
FOR SELECT
USING (is_admin(auth.uid()));

-- Check if admin_wallet_summary needs policies
CREATE POLICY "Admins can view wallet summary" ON public.admin_wallet_summary  
FOR SELECT
USING (is_admin(auth.uid()));

-- Check if agent_clients needs policies
CREATE POLICY "Admins can manage agent clients" ON public.agent_clients
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Agents can view their own clients" ON public.agent_clients
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM agents 
  WHERE agents.id = agent_clients.agent_id 
  AND agents.user_id = auth.uid()
));

-- Fix any tables that might be missing policies completely
-- First, let's ensure the is_admin function exists and works properly
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND user_role = 'admin'
  );
END;
$$;
-- Fix missing RLS policies for base tables only (not views)

-- Add policy for admin_notification_settings (base table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_notification_settings'
    AND policyname = 'Admins can manage notification settings'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can manage notification settings" ON public.admin_notification_settings
    FOR ALL
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));';
  END IF;
END $$;

-- Add policy for agent_clients (base table)  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'agent_clients'
    AND policyname = 'Admins can manage agent clients'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can manage agent clients" ON public.agent_clients
    FOR ALL
    USING (is_admin(auth.uid()));';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'agent_clients'
    AND policyname = 'Agents can view their own clients'
  ) THEN
    EXECUTE 'CREATE POLICY "Agents can view their own clients" ON public.agent_clients
    FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_clients.agent_id 
      AND agents.user_id = auth.uid()
    ));';
  END IF;
END $$;
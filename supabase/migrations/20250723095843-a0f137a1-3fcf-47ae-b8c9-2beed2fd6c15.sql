-- Fix agent applications RLS policy for admin access
-- First check if the policy already exists, if not add it
DO $$
BEGIN
    -- Check if the policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'agent_applications' 
        AND policyname = 'Admins can manage agent applications'
    ) THEN
        -- Create the admin management policy for agent applications
        CREATE POLICY "Admins can manage agent applications" ON public.agent_applications
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_role = 'admin'
          )
        );
    END IF;
END $$;

-- Also ensure agents table has proper RLS policy for admin access
DO $$
BEGIN
    -- Check if the policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'agents' 
        AND policyname = 'Admins can manage agents'
    ) THEN
        -- Create the admin management policy for agents
        CREATE POLICY "Admins can manage agents" ON public.agents
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_role = 'admin'
          )
        );
    END IF;
END $$;

-- Ensure agent_commissions has proper admin access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'agent_commissions' 
        AND policyname = 'Admins can manage agent commissions'
    ) THEN
        CREATE POLICY "Admins can manage agent commissions" ON public.agent_commissions
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_role = 'admin'
          )
        );
    END IF;
END $$;
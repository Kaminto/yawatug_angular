-- Fix the three simulation issues

-- 1. Add missing description column to transactions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN description TEXT;
  END IF;
END $$;

-- 2. Fix RLS policies for referral_earnings table
DROP POLICY IF EXISTS "Users can manage their own referral earnings" ON public.referral_earnings;

CREATE POLICY "Users can view their own referral earnings" 
ON public.referral_earnings 
FOR SELECT 
USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create referral earnings" 
ON public.referral_earnings 
FOR INSERT 
WITH CHECK (auth.uid() = referrer_id);

-- 3. Fix RLS policies for agents table  
DROP POLICY IF EXISTS "Users can view their agent data" ON public.agents;

CREATE POLICY "Users can view their agent data" 
ON public.agents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agent record" 
ON public.agents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent record" 
ON public.agents 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. Also ensure agent_applications allows updates by users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'agent_applications' 
    AND policyname = 'Users can update their own agent applications'
  ) THEN
    CREATE POLICY "Users can update their own agent applications" 
    ON public.agent_applications 
    FOR UPDATE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Fix RLS policies for user_shares table (might be needed for share purchases)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_shares' 
    AND policyname = 'Users can create their own shares'
  ) THEN
    CREATE POLICY "Users can create their own shares" 
    ON public.user_shares 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 6. Ensure proper policies for share_buyback_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'share_buyback_orders' 
    AND policyname = 'Users can create their own buyback orders'
  ) THEN
    CREATE POLICY "Users can create their own buyback orders" 
    ON public.share_buyback_orders 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
-- Fix RLS so regular users can see their own referral data
-- Referral tables: referral_commissions, referral_activities, referral_statistics

-- Enable RLS on tables (safe if already enabled)
ALTER TABLE IF EXISTS public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referral_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referral_statistics ENABLE ROW LEVEL SECURITY;

-- referral_commissions: allow users to see rows where they are the referrer; admins can see all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'referral_commissions' 
      AND policyname = 'Users can view their own referral commissions'
  ) THEN
    CREATE POLICY "Users can view their own referral commissions"
    ON public.referral_commissions
    FOR SELECT
    TO authenticated
    USING (referrer_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'referral_commissions' 
      AND policyname = 'Admins can view all referral commissions'
  ) THEN
    CREATE POLICY "Admins can view all referral commissions"
    ON public.referral_commissions
    FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));
  END IF;
END $$;

-- referral_activities: allow users to see rows where they are the referrer; admins can see all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'referral_activities' 
      AND policyname = 'Users can view their own referral activities'
  ) THEN
    CREATE POLICY "Users can view their own referral activities"
    ON public.referral_activities
    FOR SELECT
    TO authenticated
    USING (referrer_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'referral_activities' 
      AND policyname = 'Admins can view all referral activities'
  ) THEN
    CREATE POLICY "Admins can view all referral activities"
    ON public.referral_activities
    FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));
  END IF;
END $$;

-- referral_statistics: allow users to see their own summary; admins can see all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'referral_statistics' 
      AND policyname = 'Users can view their own referral statistics'
  ) THEN
    CREATE POLICY "Users can view their own referral statistics"
    ON public.referral_statistics
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'referral_statistics' 
      AND policyname = 'Admins can view all referral statistics'
  ) THEN
    CREATE POLICY "Admins can view all referral statistics"
    ON public.referral_statistics
    FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));
  END IF;
END $$;
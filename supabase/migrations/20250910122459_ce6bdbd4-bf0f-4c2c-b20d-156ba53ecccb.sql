-- Phase 1: Database-Level Improvements for Auth & Profile Sync

-- Create function to automatically create wallet when profile is created
CREATE OR REPLACE FUNCTION public.ensure_profile_wallet()
RETURNS TRIGGER AS $$
BEGIN
  -- Create UGX wallet for new profile
  INSERT INTO public.wallets (user_id, currency, balance, status)
  VALUES (NEW.id, 'UGX', 0, 'active')
  ON CONFLICT (user_id, currency) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create wallet for new profiles
DROP TRIGGER IF EXISTS auto_create_wallet_trigger ON public.profiles;
CREATE TRIGGER auto_create_wallet_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_profile_wallet();

-- Create function to find and fix orphaned profiles (profiles without auth accounts)
CREATE OR REPLACE FUNCTION public.find_orphaned_profiles()
RETURNS TABLE(
  profile_id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  needs_auth_creation BOOLEAN
) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    (p.auth_created_at IS NULL) as needs_auth_creation
  FROM public.profiles p
  WHERE p.auth_created_at IS NULL
    AND p.account_activation_status IN ('pending', 'invited')
  ORDER BY p.created_at DESC;
END;
$$;

-- Create function to find profiles without wallets
CREATE OR REPLACE FUNCTION public.find_profiles_without_wallets()
RETURNS TABLE(
  profile_id UUID,
  email TEXT,
  full_name TEXT,
  missing_currencies TEXT[]
) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    ARRAY['UGX'] as missing_currencies
  FROM public.profiles p
  LEFT JOIN public.wallets w ON p.id = w.user_id AND w.currency = 'UGX'
  WHERE w.id IS NULL
  ORDER BY p.created_at DESC;
END;
$$;

-- Create function for comprehensive sync status check
CREATE OR REPLACE FUNCTION public.get_sync_status()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
  auth_count INTEGER;
  profile_count INTEGER;
  orphaned_profiles INTEGER;
  profiles_without_wallets INTEGER;
BEGIN
  -- Count auth users (approximation through profiles with auth_created_at)
  SELECT COUNT(*) INTO auth_count 
  FROM public.profiles 
  WHERE auth_created_at IS NOT NULL;
  
  -- Count total profiles
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  
  -- Count orphaned profiles
  SELECT COUNT(*) INTO orphaned_profiles 
  FROM public.profiles 
  WHERE auth_created_at IS NULL AND account_activation_status IN ('pending', 'invited');
  
  -- Count profiles without wallets
  SELECT COUNT(*) INTO profiles_without_wallets
  FROM public.profiles p
  LEFT JOIN public.wallets w ON p.id = w.user_id AND w.currency = 'UGX'
  WHERE w.id IS NULL;
  
  result := json_build_object(
    'total_profiles', profile_count,
    'auth_accounts_estimated', auth_count,
    'orphaned_profiles', orphaned_profiles,
    'profiles_without_wallets', profiles_without_wallets,
    'sync_health_score', CASE 
      WHEN orphaned_profiles = 0 AND profiles_without_wallets = 0 THEN 100
      ELSE GREATEST(0, 100 - ((orphaned_profiles + profiles_without_wallets) * 10))
    END,
    'last_checked', NOW()
  );
  
  RETURN result;
END;
$$;

-- Create sync log table for better tracking
CREATE TABLE IF NOT EXISTS public.auth_profile_sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  target_profile_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending',
  details JSONB DEFAULT '{}',
  error_message TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on sync operations table
ALTER TABLE public.auth_profile_sync_operations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for sync operations
CREATE POLICY "Admins can manage sync operations" 
ON public.auth_profile_sync_operations 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create function to create missing wallets for all profiles
CREATE OR REPLACE FUNCTION public.create_missing_wallets()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  created_count INTEGER := 0;
  profile_record RECORD;
  result JSON;
BEGIN
  -- Create UGX wallets for profiles that don't have them
  FOR profile_record IN 
    SELECT p.id, p.email, p.full_name
    FROM public.profiles p
    LEFT JOIN public.wallets w ON p.id = w.user_id AND w.currency = 'UGX'
    WHERE w.id IS NULL
  LOOP
    INSERT INTO public.wallets (user_id, currency, balance, status)
    VALUES (profile_record.id, 'UGX', 0, 'active')
    ON CONFLICT (user_id, currency) DO NOTHING;
    
    created_count := created_count + 1;
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'wallets_created', created_count,
    'message', format('Created %s missing wallets', created_count)
  );
  
  RETURN result;
END;
$$;
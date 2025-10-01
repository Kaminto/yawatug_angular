-- Update the cleanup function to properly analyze auth.users vs profiles
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_auth_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_users_count integer := 0;
  profiles_count integer := 0;
  orphaned_count integer := 0;
  cleanup_result jsonb;
  auth_user_record record;
  orphaned_users text[] := '{}';
BEGIN
  -- Only allow admins to run this function
  IF NOT is_admin(auth.uid()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin permissions required'
    );
  END IF;

  -- Get profiles count
  SELECT COUNT(*) INTO profiles_count FROM public.profiles;
  
  -- Get auth users count and identify orphaned ones
  -- We'll use a different approach: check auth.users via SQL
  SELECT COUNT(*) INTO auth_users_count FROM auth.users;
  
  -- Find orphaned auth users (those without profiles)
  FOR auth_user_record IN 
    SELECT au.id, au.email 
    FROM auth.users au 
    LEFT JOIN public.profiles p ON au.id = p.id 
    WHERE p.id IS NULL
  LOOP
    orphaned_count := orphaned_count + 1;
    orphaned_users := array_append(orphaned_users, 
      COALESCE(auth_user_record.email, auth_user_record.id::text));
  END LOOP;
  
  cleanup_result := jsonb_build_object(
    'success', true,
    'message', 'Orphaned user analysis completed',
    'results', jsonb_build_object(
      'total_auth_users', auth_users_count,
      'total_profiles', profiles_count,
      'orphaned_users_count', orphaned_count,
      'orphaned_users_list', orphaned_users,
      'recommendation', CASE 
        WHEN orphaned_count > 0 THEN 'Found orphaned auth users that can be cleaned up'
        ELSE 'No orphaned auth users found'
      END
    )
  );
  
  RETURN cleanup_result;
END;
$$;
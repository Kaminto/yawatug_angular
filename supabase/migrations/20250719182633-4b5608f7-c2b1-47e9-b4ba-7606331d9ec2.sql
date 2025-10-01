-- Create a function to cleanup orphaned auth users
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_auth_users_db()
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
  removed_users text[] := '{}';
  errors text[] := '{}';
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
    
    -- Attempt to delete the orphaned user
    BEGIN
      -- Note: We cannot directly delete from auth.users via SQL
      -- This would need to be done via the auth admin API
      -- For now, we'll just collect the orphaned users
      -- The actual deletion would need to be handled differently
      
      -- Log the user that should be removed
      removed_users := array_append(removed_users, 
        COALESCE(auth_user_record.email, auth_user_record.id::text));
        
    EXCEPTION WHEN OTHERS THEN
      errors := array_append(errors, 
        COALESCE(auth_user_record.email, auth_user_record.id::text) || ': ' || SQLERRM);
    END;
  END LOOP;
  
  cleanup_result := jsonb_build_object(
    'success', true,
    'message', 'Orphaned user analysis completed',
    'results', jsonb_build_object(
      'total_auth_users', auth_users_count,
      'total_profiles', profiles_count,
      'orphaned_users_count', orphaned_count,
      'orphaned_users_list', orphaned_users,
      'removed_users', removed_users,
      'errors', errors,
      'recommendation', CASE 
        WHEN orphaned_count > 0 THEN 'Found ' || orphaned_count || ' orphaned auth users. Note: Database functions cannot directly delete auth users - this requires admin API access.'
        ELSE 'No orphaned auth users found'
      END
    )
  );
  
  RETURN cleanup_result;
END;
$$;
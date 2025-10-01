-- Create status reconciliation function
CREATE OR REPLACE FUNCTION public.reconcile_user_statuses()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
  updated_count integer := 0;
  club_member_count integer := 0;
  imported_user_count integer := 0;
BEGIN
  -- Update imported club members to have proper status flow
  UPDATE public.profiles 
  SET 
    account_activation_status = CASE 
      WHEN account_activation_status IS NULL AND import_batch_id IS NOT NULL THEN 'pending'
      ELSE account_activation_status
    END,
    status = CASE
      WHEN status = 'unverified' AND import_batch_id IS NOT NULL THEN 'pending_verification'
      ELSE status
    END,
    updated_at = now()
  WHERE import_batch_id IS NOT NULL 
    AND (account_activation_status IS NULL OR status = 'unverified');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Count club members
  SELECT COUNT(*) INTO club_member_count
  FROM public.investment_club_members;
  
  -- Count imported users
  SELECT COUNT(*) INTO imported_user_count
  FROM public.profiles
  WHERE import_batch_id IS NOT NULL;
  
  result := jsonb_build_object(
    'success', true,
    'updated_profiles', updated_count,
    'total_club_members', club_member_count,
    'total_imported_users', imported_user_count,
    'message', 'Status reconciliation completed'
  );
  
  RETURN result;
END;
$function$;

-- Create bulk invitation function for imported users
CREATE OR REPLACE FUNCTION public.bulk_invite_imported_users(
  p_user_ids uuid[] DEFAULT NULL,
  p_batch_size integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
  invitation_count integer := 0;
  user_id uuid;
  invitation_token text;
BEGIN
  -- If no specific user IDs provided, get eligible imported users
  IF p_user_ids IS NULL THEN
    SELECT array_agg(id) INTO p_user_ids
    FROM public.profiles
    WHERE import_batch_id IS NOT NULL
      AND account_activation_status IN ('pending', 'imported')
      AND auth_created_at IS NULL
    LIMIT p_batch_size;
  END IF;
  
  -- Process each user
  FOREACH user_id IN ARRAY p_user_ids
  LOOP
    -- Generate invitation token
    invitation_token := public.generate_invitation_token(user_id, auth.uid());
    
    IF invitation_token IS NOT NULL THEN
      invitation_count := invitation_count + 1;
    END IF;
  END LOOP;
  
  result := jsonb_build_object(
    'success', true,
    'invitations_sent', invitation_count,
    'total_processed', array_length(p_user_ids, 1),
    'message', 'Bulk invitations completed'
  );
  
  RETURN result;
END;
$function$;

-- Create user onboarding status tracking
CREATE TABLE IF NOT EXISTS public.user_onboarding_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'welcome',
  completed_steps text[] DEFAULT '{}',
  onboarding_started_at timestamp with time zone DEFAULT now(),
  onboarding_completed_at timestamp with time zone,
  is_imported_user boolean DEFAULT false,
  welcome_message_shown boolean DEFAULT false,
  profile_completion_guided boolean DEFAULT false,
  verification_guidance_shown boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_onboarding_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for onboarding status
CREATE POLICY "Users can view their own onboarding status"
ON public.user_onboarding_status
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding status"
ON public.user_onboarding_status
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding status"
ON public.user_onboarding_status
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all onboarding status"
ON public.user_onboarding_status
FOR ALL
USING (is_admin(auth.uid()));

-- Create admin notification preferences
CREATE TABLE IF NOT EXISTS public.admin_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  enabled boolean DEFAULT true,
  threshold_value numeric,
  email_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(admin_id, notification_type)
);

-- Enable RLS
ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin notifications
CREATE POLICY "Admins can manage their own notification preferences"
ON public.admin_notification_preferences
FOR ALL
USING (auth.uid() = admin_id);

-- Create bulk operations log
CREATE TABLE IF NOT EXISTS public.bulk_operations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL,
  performed_by uuid REFERENCES public.profiles(id),
  target_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  operation_data jsonb,
  status text DEFAULT 'completed',
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.bulk_operations_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for bulk operations
CREATE POLICY "Admins can view bulk operations log"
ON public.bulk_operations_log
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create bulk operations log"
ON public.bulk_operations_log
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Create trigger to automatically create onboarding status for new users
CREATE OR REPLACE FUNCTION public.create_user_onboarding_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_onboarding_status (
    user_id,
    current_step,
    is_imported_user,
    onboarding_started_at
  ) VALUES (
    NEW.id,
    CASE 
      WHEN NEW.import_batch_id IS NOT NULL THEN 'activation'
      ELSE 'welcome'
    END,
    NEW.import_batch_id IS NOT NULL,
    now()
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Create trigger
DROP TRIGGER IF EXISTS create_onboarding_status_trigger ON public.profiles;
CREATE TRIGGER create_onboarding_status_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_onboarding_status();
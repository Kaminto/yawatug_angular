
-- Phase 1: Fix database schema alignment and add missing functionality

-- 1. Add missing columns to profiles table if they don't exist
DO $$ BEGIN
    -- Add user_role column with proper default
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='user_role') THEN
        ALTER TABLE public.profiles ADD COLUMN user_role text DEFAULT 'user';
    END IF;
    
    -- Add profile completion tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='profile_completion_percentage') THEN
        ALTER TABLE public.profiles ADD COLUMN profile_completion_percentage numeric DEFAULT 0;
    END IF;
    
    -- Add verification tracking fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_profile_update') THEN
        ALTER TABLE public.profiles ADD COLUMN last_profile_update timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- 2. Create enhanced profile completion calculation function
CREATE OR REPLACE FUNCTION public.calculate_enhanced_profile_completion(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  completion_score numeric := 0;
  total_possible_score numeric := 100;
  profile_record record;
  document_count integer := 0;
  contact_count integer := 0;
  approved_document_count integer := 0;
BEGIN
  -- Get profile data
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Basic profile fields (50 points total)
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
    completion_score := completion_score + 8;
  END IF;
  
  IF profile_record.email IS NOT NULL AND profile_record.email != '' THEN
    completion_score := completion_score + 5;
  END IF;
  
  IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
    completion_score := completion_score + 8;
  END IF;
  
  IF profile_record.date_of_birth IS NOT NULL THEN
    completion_score := completion_score + 7;
  END IF;
  
  IF profile_record.gender IS NOT NULL AND profile_record.gender != '' THEN
    completion_score := completion_score + 5;
  END IF;
  
  IF profile_record.nationality IS NOT NULL AND profile_record.nationality != '' THEN
    completion_score := completion_score + 7;
  END IF;
  
  IF profile_record.country_of_residence IS NOT NULL AND profile_record.country_of_residence != '' THEN
    completion_score := completion_score + 5;
  END IF;
  
  IF profile_record.address IS NOT NULL AND profile_record.address != '' THEN
    completion_score := completion_score + 5;
  END IF;
  
  -- Account type (5 points)
  IF profile_record.account_type IS NOT NULL AND profile_record.account_type != '' THEN
    completion_score := completion_score + 5;
  END IF;
  
  -- Profile picture (10 points)
  IF profile_record.profile_picture_url IS NOT NULL AND profile_record.profile_picture_url != '' THEN
    completion_score := completion_score + 10;
  END IF;
  
  -- Documents (25 points total)
  SELECT COUNT(*) INTO document_count
  FROM public.user_documents
  WHERE user_id = p_user_id;
  
  SELECT COUNT(*) INTO approved_document_count
  FROM public.user_documents
  WHERE user_id = p_user_id AND status = 'approved';
  
  -- Points for having documents
  IF document_count >= 1 THEN
    completion_score := completion_score + 8;
  END IF;
  
  IF document_count >= 2 THEN
    completion_score := completion_score + 7;
  END IF;
  
  -- Bonus for approved documents
  IF approved_document_count >= 1 THEN
    completion_score := completion_score + 5;
  END IF;
  
  IF approved_document_count >= 2 THEN
    completion_score := completion_score + 5;
  END IF;
  
  -- Emergency contacts (10 points)
  SELECT COUNT(*) INTO contact_count
  FROM public.contact_persons
  WHERE user_id = p_user_id;
  
  IF contact_count >= 1 THEN
    completion_score := completion_score + 10;
  END IF;
  
  RETURN LEAST(completion_score, total_possible_score);
END;
$function$;

-- 3. Create trigger to auto-update profile completion
CREATE OR REPLACE FUNCTION public.update_enhanced_profile_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.profile_completion_percentage := public.calculate_enhanced_profile_completion(NEW.id);
  NEW.last_profile_update := now();
  RETURN NEW;
END;
$function$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_profile_completion ON public.profiles;
CREATE TRIGGER trigger_update_profile_completion
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_enhanced_profile_completion();

-- 4. Create audit table for profile changes
CREATE TABLE IF NOT EXISTS public.profile_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  changed_by uuid,
  change_type text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.profile_audit ENABLE ROW LEVEL SECURITY;

-- Create policy for audit table
CREATE POLICY "Admins can view all audit records" ON public.profile_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Users can view their own audit records" ON public.profile_audit
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Create function to log profile changes
CREATE OR REPLACE FUNCTION public.log_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.profile_audit (
      user_id,
      changed_by,
      change_type,
      old_values,
      new_values
    ) VALUES (
      NEW.id,
      auth.uid(),
      'profile_update',
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create audit trigger
DROP TRIGGER IF EXISTS trigger_profile_audit ON public.profiles;
CREATE TRIGGER trigger_profile_audit
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_change();

-- 6. Update all existing profiles with correct completion percentages
UPDATE public.profiles 
SET profile_completion_percentage = public.calculate_enhanced_profile_completion(id),
    last_profile_update = now()
WHERE profile_completion_percentage IS NULL OR profile_completion_percentage = 0;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON public.profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_completion ON public.profiles(profile_completion_percentage);
CREATE INDEX IF NOT EXISTS idx_profile_audit_user_id ON public.profile_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_audit_created_at ON public.profile_audit(created_at);

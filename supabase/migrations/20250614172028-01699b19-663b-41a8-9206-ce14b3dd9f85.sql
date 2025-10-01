
-- Add missing columns to profiles table for verification workflow
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_reviewed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Create user_verification_requests table for tracking verification workflow
CREATE TABLE IF NOT EXISTS public.user_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'needs_resubmission')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  admin_notes TEXT,
  rejection_reason TEXT,
  documents_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_verification_requests
ALTER TABLE public.user_verification_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for user_verification_requests
CREATE POLICY "Users can view their own verification requests" 
  ON public.user_verification_requests 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all verification requests" 
  ON public.user_verification_requests 
  FOR ALL 
  USING (public.get_current_user_role() = 'admin');

-- Create admin_verification_actions table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_verification_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('approve_profile', 'reject_profile', 'approve_document', 'reject_document', 'request_resubmission')),
  target_document_id UUID REFERENCES public.user_documents(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on admin_verification_actions
ALTER TABLE public.admin_verification_actions ENABLE ROW LEVEL SECURITY;

-- Create policy for admin_verification_actions
CREATE POLICY "Admins can manage verification actions" 
  ON public.admin_verification_actions 
  FOR ALL 
  USING (public.get_current_user_role() = 'admin');

-- Add trigger to update verification_requests when profile status changes
CREATE OR REPLACE FUNCTION public.sync_verification_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When profile status changes to pending_verification, create/update verification request
  IF NEW.status = 'pending_verification' AND (OLD.status IS NULL OR OLD.status != 'pending_verification') THEN
    INSERT INTO public.user_verification_requests (user_id, status, submitted_at)
    VALUES (NEW.id, 'pending', now())
    ON CONFLICT (user_id) DO UPDATE SET
      status = 'pending',
      submitted_at = now(),
      updated_at = now();
  END IF;
  
  -- When profile is approved
  IF NEW.status = 'active' AND OLD.status = 'pending_verification' THEN
    UPDATE public.user_verification_requests 
    SET status = 'approved', 
        reviewed_at = now(),
        updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  
  -- When profile is blocked/rejected
  IF NEW.status = 'blocked' AND OLD.status = 'pending_verification' THEN
    UPDATE public.user_verification_requests 
    SET status = 'rejected', 
        reviewed_at = now(),
        updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS sync_verification_status_trigger ON public.profiles;
CREATE TRIGGER sync_verification_status_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_verification_status();

-- Add updated_at trigger to user_verification_requests
CREATE TRIGGER update_user_verification_requests_updated_at
  BEFORE UPDATE ON public.user_verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

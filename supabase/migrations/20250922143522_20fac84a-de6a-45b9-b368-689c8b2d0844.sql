-- Add new columns to club_share_allocations table
ALTER TABLE public.club_share_allocations 
ADD COLUMN IF NOT EXISTS total_cost NUMERIC,
ADD COLUMN IF NOT EXISTS cost_per_share NUMERIC,
ADD COLUMN IF NOT EXISTS debt_rejected NUMERIC DEFAULT 0;

-- Create consent email logs table for audit trail
CREATE TABLE IF NOT EXISTS public.club_consent_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_allocation_id UUID REFERENCES public.club_share_allocations(id) NOT NULL,
  member_email TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'consent_confirmation',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  email_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on consent email logs
ALTER TABLE public.club_consent_email_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access to consent email logs
CREATE POLICY "Admins can manage consent email logs" 
ON public.club_consent_email_logs 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_club_allocations_total_cost ON public.club_share_allocations(total_cost);
CREATE INDEX IF NOT EXISTS idx_club_allocations_cost_per_share ON public.club_share_allocations(cost_per_share);
CREATE INDEX IF NOT EXISTS idx_consent_email_logs_allocation_id ON public.club_consent_email_logs(club_allocation_id);
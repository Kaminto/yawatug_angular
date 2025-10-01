-- Fix club_share_allocations status constraint and create missing tables
-- Update the allocation_status check constraint to include all needed statuses
ALTER TABLE club_share_allocations DROP CONSTRAINT IF EXISTS club_share_allocations_allocation_status_check;
ALTER TABLE club_share_allocations 
ADD CONSTRAINT club_share_allocations_allocation_status_check 
CHECK (allocation_status IN ('pending_invitation', 'pending_consent', 'accepted', 'rejected', 'expired'));

-- Create club_share_holding_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.club_share_holding_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    club_member_id UUID NOT NULL,
    club_allocation_id UUID NOT NULL REFERENCES public.club_share_allocations(id) ON DELETE CASCADE,
    shares_quantity INTEGER NOT NULL DEFAULT 0,
    shares_released INTEGER NOT NULL DEFAULT 0,  
    shares_remaining INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'holding' CHECK (status IN ('holding', 'released_partial', 'released_full')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(club_allocation_id)
);

-- Enable RLS on the new table
ALTER TABLE public.club_share_holding_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for club_share_holding_accounts
CREATE POLICY "Admins can manage club share holding accounts" 
ON public.club_share_holding_accounts 
FOR ALL 
USING (is_admin(auth.uid())) 
WITH CHECK (is_admin(auth.uid()));
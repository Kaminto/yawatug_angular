-- First drop the existing constraint
ALTER TABLE club_share_allocations DROP CONSTRAINT IF EXISTS club_share_allocations_allocation_status_check;

-- Update existing records from pending_activation to pending_invitation
UPDATE club_share_allocations 
SET allocation_status = 'pending_invitation' 
WHERE allocation_status = 'pending_activation';

-- Add the constraint allowing pending_invitation (and keep other valid statuses)
ALTER TABLE club_share_allocations 
ADD CONSTRAINT club_share_allocations_allocation_status_check 
CHECK (allocation_status IN ('pending_invitation', 'accepted', 'rejected', 'expired'));
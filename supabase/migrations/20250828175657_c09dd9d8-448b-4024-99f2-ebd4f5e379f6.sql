-- Update the check constraint to include 'invited' status
ALTER TABLE club_share_allocations 
DROP CONSTRAINT club_share_allocations_allocation_status_check;

ALTER TABLE club_share_allocations 
ADD CONSTRAINT club_share_allocations_allocation_status_check 
CHECK (allocation_status = ANY (ARRAY['pending'::text, 'invited'::text, 'accepted'::text, 'rejected'::text, 'released_partially'::text, 'released_fully'::text]));
-- Fix the 3 issues: drop redundant table, fix allocation status constraint, and update activation template

-- 1. Drop the redundant transaction_fee_collections table
DROP TABLE IF EXISTS transaction_fee_collections CASCADE;

-- 2. Update the allocation_status check constraint to allow the correct values
ALTER TABLE club_share_allocations DROP CONSTRAINT IF EXISTS club_share_allocations_allocation_status_check;
ALTER TABLE club_share_allocations ADD CONSTRAINT club_share_allocations_allocation_status_check 
CHECK (allocation_status IN ('pending_activation', 'pending_consent', 'consented', 'rejected', 'allocated', 'released'));

-- 3. Create a function to build activation URLs properly
CREATE OR REPLACE FUNCTION public.build_activation_url(p_token text, p_base_url text DEFAULT 'https://yawatug.com')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN p_base_url || '/activate-account?token=' || encode(p_token::bytea, 'base64url');
END;
$$;
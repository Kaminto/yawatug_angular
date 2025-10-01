-- Fix the club share allocation and create missing profiles

-- First, let's create missing profiles for club members
INSERT INTO profiles (
  id,
  full_name,
  email,
  user_type,
  account_type,
  user_role,
  import_batch_id,
  account_activation_status,
  first_login_token,
  first_login_token_expires_at,
  is_first_login,
  profile_completion_percentage,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  icm.member_name,
  icm.email,
  'individual',
  'individual',
  'user',
  'CLUB-IMPORT-' || TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
  'activation_required',
  encode(gen_random_bytes(32), 'hex'),
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  true,
  25,
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM investment_club_members icm
WHERE icm.email IS NOT NULL 
  AND icm.email NOT IN (SELECT email FROM profiles WHERE email IS NOT NULL)
  AND icm.email != '';

-- Clear any invalid holding account records that were created with wrong club_allocation_id
DELETE FROM club_share_holding_account 
WHERE club_allocation_id NOT IN (SELECT id FROM club_share_allocations);

-- Now properly create holding accounts for all allocations that don't have them
INSERT INTO club_share_holding_account (
  club_member_id,
  club_allocation_id,
  shares_quantity,
  status,
  created_at,
  updated_at
)
SELECT 
  csa.club_member_id,
  csa.id,
  csa.allocated_shares,
  'holding',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM club_share_allocations csa
WHERE NOT EXISTS (
  SELECT 1 FROM club_share_holding_account csha 
  WHERE csha.club_allocation_id = csa.id
);
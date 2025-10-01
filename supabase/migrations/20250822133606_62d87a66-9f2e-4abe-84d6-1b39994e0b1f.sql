-- Comprehensive migration to consolidate to single share system

-- Step 1: Migrate all references from duplicate record to primary record

-- Migrate share_bookings
UPDATE share_bookings 
SET share_id = '97f172e0-4798-4d88-b838-bd88215e94fe'
WHERE share_id = '3ad71df4-21a6-484d-abad-ed60e0e979a2';

-- Migrate user_shares 
UPDATE user_shares 
SET share_id = '97f172e0-4798-4d88-b838-bd88215e94fe'
WHERE share_id = '3ad71df4-21a6-484d-abad-ed60e0e979a2';

-- Step 2: Delete the duplicate share record
DELETE FROM shares 
WHERE id = '3ad71df4-21a6-484d-abad-ed60e0e979a2';

-- Step 3: Update the primary share record name to be consistent
UPDATE shares 
SET name = 'Yawatu Ordinary Shares'
WHERE id = '97f172e0-4798-4d88-b838-bd88215e94fe';

-- Step 4: Recalculate available shares properly accounting for all holdings and pending bookings
UPDATE shares 
SET available_shares = total_shares - (
  SELECT COALESCE(SUM(quantity), 0) 
  FROM user_share_holdings 
  WHERE share_id = shares.id
) - (
  SELECT COALESCE(SUM(quantity), 0) 
  FROM share_bookings 
  WHERE share_id = shares.id AND status = 'pending'
) - COALESCE((reserved_shares - reserved_issued), 0)
WHERE id = '97f172e0-4798-4d88-b838-bd88215e94fe';
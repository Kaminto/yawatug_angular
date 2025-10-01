-- Step 1: Migrate bookings from duplicate record to primary record
UPDATE share_bookings 
SET share_id = '97f172e0-4798-4d88-b838-bd88215e94fe'
WHERE share_id = '3ad71df4-21a6-484d-abad-ed60e0e979a2';

-- Step 2: Delete the duplicate share record first (to avoid unique constraint conflict)
DELETE FROM shares 
WHERE id = '3ad71df4-21a6-484d-abad-ed60e0e979a2';

-- Step 3: Now update the primary share record name to be consistent
UPDATE shares 
SET name = 'Yawatu Ordinary Shares'
WHERE id = '97f172e0-4798-4d88-b838-bd88215e94fe';

-- Step 4: Update available shares calculation to properly account for pending bookings
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
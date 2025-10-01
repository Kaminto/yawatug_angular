-- Comprehensive migration to consolidate duplicate share records with proper merging

-- Step 1: Merge user_shares by consolidating holdings from duplicate to primary record
-- First, update the primary record with combined quantity and weighted average price
UPDATE user_shares 
SET 
  quantity = quantity + (
    SELECT quantity FROM user_shares duplicate_record 
    WHERE duplicate_record.user_id = user_shares.user_id 
    AND duplicate_record.share_id = '3ad71df4-21a6-484d-abad-ed60e0e979a2'
  ),
  purchase_price_per_share = (
    (quantity * purchase_price_per_share) + 
    (
      SELECT quantity * purchase_price_per_share 
      FROM user_shares duplicate_record 
      WHERE duplicate_record.user_id = user_shares.user_id 
      AND duplicate_record.share_id = '3ad71df4-21a6-484d-abad-ed60e0e979a2'
    )
  ) / (
    quantity + (
      SELECT quantity FROM user_shares duplicate_record 
      WHERE duplicate_record.user_id = user_shares.user_id 
      AND duplicate_record.share_id = '3ad71df4-21a6-484d-abad-ed60e0e979a2'
    )
  )
WHERE share_id = '97f172e0-4798-4d88-b838-bd88215e94fe'
AND EXISTS (
  SELECT 1 FROM user_shares duplicate_record 
  WHERE duplicate_record.user_id = user_shares.user_id 
  AND duplicate_record.share_id = '3ad71df4-21a6-484d-abad-ed60e0e979a2'
);

-- Step 2: Delete the duplicate user_shares records
DELETE FROM user_shares 
WHERE share_id = '3ad71df4-21a6-484d-abad-ed60e0e979a2';

-- Step 3: Migrate share_bookings 
UPDATE share_bookings 
SET share_id = '97f172e0-4798-4d88-b838-bd88215e94fe'
WHERE share_id = '3ad71df4-21a6-484d-abad-ed60e0e979a2';

-- Step 4: Delete the duplicate share record
DELETE FROM shares 
WHERE id = '3ad71df4-21a6-484d-abad-ed60e0e979a2';

-- Step 5: Update the primary share record name to be consistent
UPDATE shares 
SET name = 'Yawatu Ordinary Shares'
WHERE id = '97f172e0-4798-4d88-b838-bd88215e94fe';
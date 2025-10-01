-- Step 1: Migrate bookings from duplicate record to primary record
UPDATE share_bookings 
SET share_id = '97f172e0-4798-4d88-b838-bd88215e94fe'
WHERE share_id = '3ad71df4-21a6-484d-abad-ed60e0e979a2';

-- Step 2: Update the primary share record name to be consistent
UPDATE shares 
SET name = 'Yawatu Ordinary Shares'
WHERE id = '97f172e0-4798-4d88-b838-bd88215e94fe';

-- Step 3: Delete the duplicate share record
DELETE FROM shares 
WHERE id = '3ad71df4-21a6-484d-abad-ed60e0e979a2';

-- Step 4: Verify the cleanup
SELECT 'Final share records:' as status;
SELECT id, name, price_per_share, total_shares, available_shares, created_at FROM shares;

SELECT 'Booking distribution after migration:' as status;
SELECT share_id, COUNT(*) as booking_count FROM share_bookings GROUP BY share_id;

SELECT 'Holdings distribution:' as status;
SELECT share_id, COUNT(*) as holding_count FROM user_share_holdings GROUP BY share_id;
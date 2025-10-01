-- Step 1: Identify the canonical share record (most recent with most data)
WITH canonical_share AS (
  SELECT id, name, price_per_share, total_shares, available_shares, 
         current_price, currency, description, created_at, updated_at
  FROM shares 
  WHERE name = 'Yawatu Ordinary Shares'
  ORDER BY 
    CASE WHEN current_price IS NOT NULL THEN 1 ELSE 0 END DESC,
    CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END DESC,
    updated_at DESC, 
    created_at DESC
  LIMIT 1
),
duplicate_shares AS (
  SELECT id 
  FROM shares 
  WHERE name = 'Yawatu Ordinary Shares' 
    AND id != (SELECT id FROM canonical_share)
)

-- Step 2: Update foreign key references to point to canonical record
UPDATE user_share_holdings 
SET share_id = (SELECT id FROM canonical_share)
WHERE share_id IN (SELECT id FROM duplicate_shares);

UPDATE transactions 
SET admin_notes = CASE 
  WHEN admin_notes IS NOT NULL AND admin_notes::text LIKE '%share_id%' 
  THEN jsonb_set(admin_notes::jsonb, '{share_id}', to_jsonb((SELECT id FROM canonical_share)::text))
  ELSE admin_notes
END
WHERE transaction_type = 'share_purchase' 
  AND admin_notes IS NOT NULL;

-- Update share_reserve_allocations if they exist
UPDATE share_reserve_allocations 
SET share_id = (SELECT id FROM canonical_share)
WHERE share_id IN (SELECT id FROM duplicate_shares);

-- Update any other tables that might reference shares
UPDATE share_bookings 
SET share_id = (SELECT id FROM canonical_share)
WHERE share_id IN (SELECT id FROM duplicate_shares);

-- Step 3: Delete duplicate share records
DELETE FROM shares 
WHERE id IN (SELECT id FROM duplicate_shares);

-- Step 4: Add unique constraint on share name to prevent future duplicates
ALTER TABLE shares ADD CONSTRAINT shares_name_unique UNIQUE (name);

-- Step 5: Update the canonical share with correct available_shares calculation
WITH share_sales AS (
  SELECT COALESCE(SUM(
    CASE 
      WHEN admin_notes IS NOT NULL AND admin_notes::text LIKE '%quantity%' 
      THEN (admin_notes->>'quantity')::integer
      ELSE 0
    END
  ), 0) as total_sold
  FROM transactions 
  WHERE transaction_type = 'share_purchase' 
    AND status = 'completed'
)
UPDATE shares 
SET available_shares = GREATEST(0, total_shares - (SELECT total_sold FROM share_sales)),
    updated_at = now()
WHERE name = 'Yawatu Ordinary Shares';
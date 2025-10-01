-- Safely consolidate shares while preserving foreign key integrity

-- Step 1: Get the main share record to keep (most recent one)
WITH main_share AS (
  SELECT id, available_shares, total_shares FROM shares 
  ORDER BY created_at DESC 
  LIMIT 1
),
-- Step 2: Calculate actual shares sold from transactions
shares_sold_calc AS (
  SELECT COALESCE(
    SUM(CASE 
      WHEN transaction_type = 'share_purchase' 
      AND status = 'completed' 
      AND admin_notes IS NOT NULL 
      AND admin_notes::text LIKE '%quantity%'
      THEN (admin_notes::jsonb->>'quantity')::numeric
      ELSE 0 
    END), 0
  ) as total_sold
  FROM transactions 
  WHERE transaction_type = 'share_purchase'
)
-- Step 3: Update all foreign key references to point to main share
UPDATE user_shares 
SET share_id = (SELECT id FROM main_share)
WHERE share_id != (SELECT id FROM main_share);

-- Step 4: Update transactions that reference shares
UPDATE transactions 
SET admin_notes = jsonb_set(
  COALESCE(admin_notes::jsonb, '{}'::jsonb),
  '{share_id}',
  to_jsonb((SELECT id FROM shares ORDER BY created_at DESC LIMIT 1)::text)
)
WHERE transaction_type = 'share_purchase' 
AND admin_notes IS NOT NULL
AND admin_notes::text LIKE '%share_id%'
AND (admin_notes::jsonb->>'share_id')::uuid != (SELECT id FROM shares ORDER BY created_at DESC LIMIT 1);

-- Step 5: Update the main share with correct available shares
WITH shares_sold_calc AS (
  SELECT COALESCE(
    SUM(CASE 
      WHEN transaction_type = 'share_purchase' 
      AND status = 'completed' 
      AND admin_notes IS NOT NULL 
      AND admin_notes::text LIKE '%quantity%'
      THEN (admin_notes::jsonb->>'quantity')::numeric
      ELSE 0 
    END), 0
  ) as total_sold
  FROM transactions 
  WHERE transaction_type = 'share_purchase'
)
UPDATE shares 
SET 
  available_shares = GREATEST(0, 1000000 - (SELECT total_sold FROM shares_sold_calc)),
  total_shares = 1000000,
  updated_at = now()
WHERE id = (SELECT id FROM shares ORDER BY created_at DESC LIMIT 1);

-- Step 6: Delete duplicate shares (now safe since FK references updated)
DELETE FROM shares 
WHERE id != (SELECT id FROM shares ORDER BY created_at DESC LIMIT 1);

-- Step 7: Add constraint to prevent future duplicates
ALTER TABLE shares ADD CONSTRAINT unique_share_name UNIQUE (name);
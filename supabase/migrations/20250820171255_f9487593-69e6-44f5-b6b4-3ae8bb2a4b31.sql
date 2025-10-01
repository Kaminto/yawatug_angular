-- Consolidate duplicate shares into one main record
-- This will preserve transaction integrity while cleaning up the duplicates

-- First, let's check actual share usage from transactions
WITH transaction_summary AS (
  SELECT 
    COUNT(CASE WHEN transaction_type = 'share_purchase' THEN 1 END) as total_purchases,
    SUM(CASE WHEN transaction_type = 'share_purchase' AND status = 'completed' THEN ABS(share_quantity) ELSE 0 END) as shares_sold
  FROM transactions 
  WHERE transaction_type LIKE '%share%'
),
latest_share AS (
  SELECT * FROM shares 
  ORDER BY created_at DESC 
  LIMIT 1
)
-- Update the most recent share record with consolidated data
UPDATE shares 
SET 
  available_shares = 1000000 - COALESCE((SELECT shares_sold FROM transaction_summary), 0),
  total_shares = 1000000,
  updated_at = now()
WHERE id = (SELECT id FROM latest_share);

-- Delete all duplicate share records except the most recent one
DELETE FROM shares 
WHERE id != (
  SELECT id FROM shares 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Add constraint to prevent future duplicates
ALTER TABLE shares ADD CONSTRAINT unique_share_name UNIQUE (name);
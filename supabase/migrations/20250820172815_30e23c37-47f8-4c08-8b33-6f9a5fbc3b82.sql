-- Consolidate duplicate shares and calculate actual share usage
-- Extract quantity from admin_notes JSON field where it exists

WITH transaction_summary AS (
  SELECT 
    COUNT(CASE WHEN transaction_type = 'share_purchase' AND status = 'completed' THEN 1 END) as total_purchases,
    COALESCE(
      SUM(CASE 
        WHEN transaction_type = 'share_purchase' 
        AND status = 'completed' 
        AND admin_notes IS NOT NULL 
        AND admin_notes::text LIKE '%quantity%'
        THEN (admin_notes::jsonb->>'quantity')::numeric
        ELSE 0 
      END), 0
    ) as shares_sold
  FROM transactions 
  WHERE transaction_type = 'share_purchase'
),
latest_share AS (
  SELECT * FROM shares 
  ORDER BY created_at DESC 
  LIMIT 1
)
-- Update the most recent share record with consolidated data
UPDATE shares 
SET 
  available_shares = GREATEST(0, 1000000 - (SELECT shares_sold FROM transaction_summary)),
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
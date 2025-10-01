-- Simple cleanup: just remove duplicates and add constraint
DO $$
DECLARE
  canonical_id UUID;
  duplicate_count INTEGER;
BEGIN
  -- Count duplicates first
  SELECT COUNT(*) INTO duplicate_count 
  FROM shares 
  WHERE name = 'Yawatu Ordinary Shares';
  
  RAISE NOTICE 'Found % share records with name "Yawatu Ordinary Shares"', duplicate_count;
  
  -- Find the canonical share record (most recent with most complete data)
  SELECT id INTO canonical_id
  FROM shares 
  WHERE name = 'Yawatu Ordinary Shares'
  ORDER BY 
    CASE WHEN current_price IS NOT NULL THEN 1 ELSE 0 END DESC,
    CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END DESC,
    updated_at DESC, 
    created_at DESC
  LIMIT 1;
  
  RAISE NOTICE 'Canonical share ID: %', canonical_id;
  
  -- Update user_share_holdings table if it exists and has share_id column
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_share_holdings') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_share_holdings' AND column_name = 'share_id') THEN
    UPDATE user_share_holdings 
    SET share_id = canonical_id
    WHERE share_id IN (
      SELECT id FROM shares 
      WHERE name = 'Yawatu Ordinary Shares' AND id != canonical_id
    );
    RAISE NOTICE 'Updated user_share_holdings references';
  END IF;
  
  -- Delete duplicate records (keep only the canonical one)
  DELETE FROM shares 
  WHERE name = 'Yawatu Ordinary Shares' AND id != canonical_id;
  
  RAISE NOTICE 'Deleted duplicate share records';
  
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'shares_name_unique') THEN
    ALTER TABLE shares ADD CONSTRAINT shares_name_unique UNIQUE (name);
    RAISE NOTICE 'Added unique constraint on share name';
  END IF;
  
  -- Recalculate available_shares for the canonical record
  UPDATE shares 
  SET available_shares = GREATEST(0, total_shares - COALESCE((
    SELECT SUM(
      CASE 
        WHEN admin_notes IS NOT NULL AND admin_notes::text LIKE '%quantity%' 
        THEN (admin_notes->>'quantity')::integer
        ELSE 0
      END
    )
    FROM transactions 
    WHERE transaction_type = 'share_purchase' 
      AND status = 'completed'
  ), 0)),
  updated_at = now()
  WHERE id = canonical_id;
  
  RAISE NOTICE 'Updated available_shares calculation';
  
END $$;
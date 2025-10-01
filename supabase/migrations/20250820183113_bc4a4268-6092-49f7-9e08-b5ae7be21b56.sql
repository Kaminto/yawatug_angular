-- Step 1: Find and store the canonical share ID
DO $$
DECLARE
  canonical_id UUID;
  duplicate_ids UUID[];
BEGIN
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
  
  -- Get array of duplicate IDs
  SELECT ARRAY_AGG(id) INTO duplicate_ids
  FROM shares 
  WHERE name = 'Yawatu Ordinary Shares' 
    AND id != canonical_id;
  
  -- Update foreign key references
  UPDATE user_share_holdings 
  SET share_id = canonical_id
  WHERE share_id = ANY(duplicate_ids);
  
  -- Update share_reserve_allocations if they exist
  UPDATE share_reserve_allocations 
  SET share_id = canonical_id
  WHERE share_id = ANY(duplicate_ids);
  
  -- Update share_bookings if they exist
  UPDATE share_bookings 
  SET share_id = canonical_id
  WHERE share_id = ANY(duplicate_ids);
  
  -- Delete duplicate records
  DELETE FROM shares 
  WHERE id = ANY(duplicate_ids);
  
  -- Add unique constraint
  ALTER TABLE shares ADD CONSTRAINT shares_name_unique UNIQUE (name);
  
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
  
END $$;
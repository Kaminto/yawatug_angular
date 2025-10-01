-- Simple duplicate cleanup
DO $$
DECLARE
  canonical_id UUID;
  deleted_count INTEGER;
BEGIN
  -- Find the canonical share record (most recent)
  SELECT id INTO canonical_id
  FROM shares 
  WHERE name = 'Yawatu Ordinary Shares'
  ORDER BY updated_at DESC, created_at DESC
  LIMIT 1;
  
  -- Update any foreign key references in user_share_holdings if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_share_holdings') THEN
    UPDATE user_share_holdings 
    SET share_id = canonical_id
    WHERE share_id IN (
      SELECT id FROM shares 
      WHERE name = 'Yawatu Ordinary Shares' AND id != canonical_id
    );
  END IF;
  
  -- Delete duplicate records
  DELETE FROM shares 
  WHERE name = 'Yawatu Ordinary Shares' AND id != canonical_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate share records', deleted_count;
  
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'shares_name_unique' 
    AND table_name = 'shares'
  ) THEN
    ALTER TABLE shares ADD CONSTRAINT shares_name_unique UNIQUE (name);
    RAISE NOTICE 'Added unique constraint on share name';
  END IF;
  
  RAISE NOTICE 'Database cleanup completed. Canonical share ID: %', canonical_id;
  
END $$;
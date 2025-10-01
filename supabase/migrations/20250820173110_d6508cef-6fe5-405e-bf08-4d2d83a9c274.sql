-- Update ALL foreign key references to shares table before consolidation

-- Get the main share record (most recent)
DO $$
DECLARE
    main_share_id UUID;
    shares_sold_total NUMERIC := 0;
BEGIN
    -- Get the main share ID
    SELECT id INTO main_share_id FROM shares ORDER BY created_at DESC LIMIT 1;
    
    -- Calculate total shares sold from transactions
    SELECT COALESCE(
        SUM(CASE 
            WHEN transaction_type = 'share_purchase' 
            AND status = 'completed' 
            AND admin_notes IS NOT NULL 
            AND admin_notes::text LIKE '%quantity%'
            THEN (admin_notes::jsonb->>'quantity')::numeric
            ELSE 0 
        END), 0
    ) INTO shares_sold_total
    FROM transactions 
    WHERE transaction_type = 'share_purchase';
    
    -- Update user_shares foreign keys
    UPDATE user_shares SET share_id = main_share_id WHERE share_id != main_share_id;
    
    -- Update share_transactions foreign keys if table exists
    BEGIN
        UPDATE share_transactions SET share_id = main_share_id WHERE share_id != main_share_id;
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, continue
        NULL;
    END;
    
    -- Update any other tables that might reference shares
    BEGIN
        UPDATE share_orders SET share_id = main_share_id WHERE share_id != main_share_id;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    BEGIN
        UPDATE share_buyback_orders SET share_id = main_share_id WHERE share_id != main_share_id;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    -- Update transaction admin_notes to reference main share
    UPDATE transactions 
    SET admin_notes = jsonb_set(
        COALESCE(admin_notes::jsonb, '{}'::jsonb),
        '{share_id}',
        to_jsonb(main_share_id::text)
    )
    WHERE transaction_type = 'share_purchase' 
    AND admin_notes IS NOT NULL
    AND admin_notes::text LIKE '%share_id%'
    AND (admin_notes::jsonb->>'share_id')::uuid != main_share_id;
    
    -- Update the main share with correct data
    UPDATE shares 
    SET 
        available_shares = GREATEST(0, 1000000 - shares_sold_total),
        total_shares = 1000000,
        updated_at = now()
    WHERE id = main_share_id;
    
    -- Delete all duplicate shares
    DELETE FROM shares WHERE id != main_share_id;
    
END $$;

-- Add constraint to prevent future duplicates
ALTER TABLE shares ADD CONSTRAINT IF NOT EXISTS unique_share_name UNIQUE (name);
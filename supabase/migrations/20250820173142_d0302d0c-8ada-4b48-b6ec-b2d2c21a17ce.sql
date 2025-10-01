-- Update ALL foreign key references and consolidate shares

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
    
    -- Update all foreign key references to point to main share
    UPDATE user_shares SET share_id = main_share_id WHERE share_id != main_share_id;
    UPDATE share_transactions SET share_id = main_share_id WHERE share_id != main_share_id;
    UPDATE share_buyback_orders SET share_id = main_share_id WHERE share_id != main_share_id;
    UPDATE share_purchase_orders SET share_id = main_share_id WHERE share_id != main_share_id;
    UPDATE share_price_history SET share_id = main_share_id WHERE share_id != main_share_id;
    UPDATE enhanced_share_price_calculations SET share_id = main_share_id WHERE share_id != main_share_id;
    UPDATE share_bookings SET share_id = main_share_id WHERE share_id != main_share_id;
    UPDATE share_order_book SET share_id = main_share_id WHERE share_id != main_share_id;
    UPDATE share_pool_settings SET share_id = main_share_id WHERE share_id != main_share_id;
    UPDATE share_transfer_requests SET share_id = main_share_id WHERE share_id != main_share_id;
    UPDATE user_share_holdings SET share_id = main_share_id WHERE share_id != main_share_id;
    
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

-- Add constraint to prevent future duplicates (check if exists first)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'unique_share_name') THEN
        ALTER TABLE shares ADD CONSTRAINT unique_share_name UNIQUE (name);
    END IF;
END $$;
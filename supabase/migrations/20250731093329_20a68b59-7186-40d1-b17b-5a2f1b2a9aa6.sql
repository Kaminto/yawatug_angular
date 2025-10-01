-- Fix the reconciliation function to handle all transaction types correctly
CREATE OR REPLACE FUNCTION reconcile_user_share_holdings(p_user_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  current_holdings NUMERIC := 0;
  calculated_holdings NUMERIC := 0;
  avg_purchase_price NUMERIC;
  result jsonb := '{}';
BEGIN
  -- Process all users if no specific user provided
  FOR user_record IN 
    SELECT DISTINCT user_id FROM share_transactions 
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
  LOOP
    -- Get current holdings from user_shares
    SELECT COALESCE(quantity, 0) INTO current_holdings
    FROM user_shares 
    WHERE user_id = user_record.user_id
    LIMIT 1;
    
    -- Calculate actual holdings from transactions - handle all transaction types
    SELECT COALESCE(SUM(
      CASE 
        WHEN transaction_type IN ('purchase', 'buy', 'issue') THEN quantity
        WHEN transaction_type IN ('sale', 'sell') THEN -quantity
        WHEN transaction_type = 'transfer_in' THEN quantity
        WHEN transaction_type = 'transfer_out' THEN -quantity
        ELSE 0
      END
    ), 0) INTO calculated_holdings
    FROM share_transactions 
    WHERE user_id = user_record.user_id 
      AND status = 'completed';
    
    -- Calculate average purchase price from all buying transactions
    SELECT AVG(price_per_share) INTO avg_purchase_price
    FROM share_transactions 
    WHERE user_id = user_record.user_id 
      AND transaction_type IN ('purchase', 'buy', 'issue') 
      AND status = 'completed';
    
    -- If no purchase price found, use current share price
    IF avg_purchase_price IS NULL THEN
      SELECT price_per_share INTO avg_purchase_price FROM shares LIMIT 1;
    END IF;
    
    -- Update or insert correct holdings only if calculated_holdings > 0
    IF calculated_holdings > 0 THEN
      INSERT INTO user_shares (user_id, share_id, quantity, purchase_price_per_share, currency)
      VALUES (
        user_record.user_id, 
        (SELECT id FROM shares LIMIT 1), 
        calculated_holdings, 
        avg_purchase_price,
        'UGX'
      )
      ON CONFLICT (user_id, share_id) 
      DO UPDATE SET 
        quantity = calculated_holdings,
        purchase_price_per_share = avg_purchase_price,
        updated_at = now();
      
      -- Update user_share_holdings table as well
      INSERT INTO user_share_holdings (user_id, share_id, quantity, average_purchase_price, currency)
      VALUES (
        user_record.user_id,
        (SELECT id FROM shares LIMIT 1),
        calculated_holdings,
        avg_purchase_price,
        'UGX'
      )
      ON CONFLICT (user_id, share_id)
      DO UPDATE SET
        quantity = calculated_holdings,
        average_purchase_price = avg_purchase_price,
        updated_at = now();
    ELSE
      -- If no holdings, remove any existing records
      DELETE FROM user_shares WHERE user_id = user_record.user_id;
      DELETE FROM user_share_holdings WHERE user_id = user_record.user_id;
    END IF;
    
    result := jsonb_set(result, ARRAY[user_record.user_id::text], 
      jsonb_build_object(
        'previous_holdings', current_holdings,
        'calculated_holdings', calculated_holdings,
        'difference', calculated_holdings - current_holdings
      )
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'reconciled_users', result,
    'timestamp', now()
  );
END;
$$;

-- Also update the trigger function to handle all transaction types
CREATE OR REPLACE FUNCTION process_share_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process completed transactions
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    CASE NEW.transaction_type
      WHEN 'purchase', 'buy', 'issue' THEN
        -- Update user holdings
        INSERT INTO user_shares (user_id, share_id, quantity, purchase_price_per_share, currency)
        VALUES (NEW.user_id, NEW.share_id, NEW.quantity, NEW.price_per_share, NEW.currency)
        ON CONFLICT (user_id, share_id)
        DO UPDATE SET 
          quantity = user_shares.quantity + NEW.quantity,
          updated_at = now();
        
        -- Update user_share_holdings
        INSERT INTO user_share_holdings (user_id, share_id, quantity, average_purchase_price, currency)
        VALUES (NEW.user_id, NEW.share_id, NEW.quantity, NEW.price_per_share, NEW.currency)
        ON CONFLICT (user_id, share_id)
        DO UPDATE SET
          quantity = user_share_holdings.quantity + NEW.quantity,
          average_purchase_price = (
            (user_share_holdings.average_purchase_price * user_share_holdings.quantity + NEW.price_per_share * NEW.quantity) /
            (user_share_holdings.quantity + NEW.quantity)
          ),
          updated_at = now();
        
        -- Decrease available shares
        UPDATE shares SET 
          available_shares = available_shares - NEW.quantity,
          updated_at = now()
        WHERE id = NEW.share_id;
        
      WHEN 'sale', 'sell' THEN
        -- Update user holdings
        UPDATE user_shares SET 
          quantity = quantity - NEW.quantity,
          updated_at = now()
        WHERE user_id = NEW.user_id AND share_id = NEW.share_id;
        
        -- Update user_share_holdings
        UPDATE user_share_holdings SET
          quantity = quantity - NEW.quantity,
          updated_at = now()
        WHERE user_id = NEW.user_id AND share_id = NEW.share_id;
        
        -- Increase available shares
        UPDATE shares SET 
          available_shares = available_shares + NEW.quantity,
          updated_at = now()
        WHERE id = NEW.share_id;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Run the corrected reconciliation
SELECT reconcile_user_share_holdings('3378baf3-0b9c-4549-b5d6-7096f131f4c5');
-- Fix the reconciliation function to handle null purchase prices
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
    
    -- Calculate actual holdings from transactions
    SELECT COALESCE(SUM(
      CASE 
        WHEN transaction_type = 'purchase' THEN quantity
        WHEN transaction_type = 'sale' THEN -quantity
        WHEN transaction_type = 'transfer_in' THEN quantity
        WHEN transaction_type = 'transfer_out' THEN -quantity
        ELSE 0
      END
    ), 0) INTO calculated_holdings
    FROM share_transactions 
    WHERE user_id = user_record.user_id 
      AND status = 'completed';
    
    -- Calculate average purchase price, defaulting to current share price if none found
    SELECT AVG(price_per_share) INTO avg_purchase_price
    FROM share_transactions 
    WHERE user_id = user_record.user_id 
      AND transaction_type = 'purchase' 
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

-- Run the reconciliation again
SELECT reconcile_user_share_holdings('3378baf3-0b9c-4549-b5d6-7096f131f4c5');
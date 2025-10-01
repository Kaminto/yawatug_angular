-- Create the reconciliation function first
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
    
    -- Update or insert correct holdings
    INSERT INTO user_shares (user_id, share_id, quantity, purchase_price_per_share, currency)
    VALUES (
      user_record.user_id, 
      (SELECT id FROM shares LIMIT 1), 
      calculated_holdings, 
      (SELECT AVG(price_per_share) FROM share_transactions 
       WHERE user_id = user_record.user_id AND transaction_type = 'purchase' AND status = 'completed'),
      'UGX'
    )
    ON CONFLICT (user_id, share_id) 
    DO UPDATE SET 
      quantity = calculated_holdings,
      updated_at = now();
    
    -- Update user_share_holdings table as well
    INSERT INTO user_share_holdings (user_id, share_id, quantity, average_purchase_price, currency)
    VALUES (
      user_record.user_id,
      (SELECT id FROM shares LIMIT 1),
      calculated_holdings,
      (SELECT AVG(price_per_share) FROM share_transactions 
       WHERE user_id = user_record.user_id AND transaction_type = 'purchase' AND status = 'completed'),
      'UGX'
    )
    ON CONFLICT (user_id, share_id)
    DO UPDATE SET
      quantity = calculated_holdings,
      updated_at = now();
    
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
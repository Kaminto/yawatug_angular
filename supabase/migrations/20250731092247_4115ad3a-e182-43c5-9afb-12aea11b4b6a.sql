-- Step 1: Create data reconciliation function
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

-- Step 2: Create trigger to auto-update holdings on transaction completion
CREATE OR REPLACE FUNCTION process_share_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  shares_to_update NUMERIC;
  current_available NUMERIC;
BEGIN
  -- Only process completed transactions
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get current available shares
    SELECT available_shares INTO current_available FROM shares WHERE id = NEW.share_id;
    
    -- Calculate share changes based on transaction type
    CASE NEW.transaction_type
      WHEN 'purchase' THEN
        shares_to_update := NEW.quantity;
        
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
        
      WHEN 'sale' THEN
        shares_to_update := -NEW.quantity;
        
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
        
      WHEN 'transfer_in' THEN
        -- Add shares for recipient
        INSERT INTO user_shares (user_id, share_id, quantity, purchase_price_per_share, currency)
        VALUES (NEW.user_id, NEW.share_id, NEW.quantity, NEW.price_per_share, NEW.currency)
        ON CONFLICT (user_id, share_id)
        DO UPDATE SET 
          quantity = user_shares.quantity + NEW.quantity,
          updated_at = now();
          
        INSERT INTO user_share_holdings (user_id, share_id, quantity, average_purchase_price, currency)
        VALUES (NEW.user_id, NEW.share_id, NEW.quantity, NEW.price_per_share, NEW.currency)
        ON CONFLICT (user_id, share_id)
        DO UPDATE SET
          quantity = user_share_holdings.quantity + NEW.quantity,
          updated_at = now();
        
      WHEN 'transfer_out' THEN
        -- Remove shares from sender
        UPDATE user_shares SET 
          quantity = quantity - NEW.quantity,
          updated_at = now()
        WHERE user_id = NEW.user_id AND share_id = NEW.share_id;
        
        UPDATE user_share_holdings SET
          quantity = quantity - NEW.quantity,
          updated_at = now()
        WHERE user_id = NEW.user_id AND share_id = NEW.share_id;
    END CASE;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_process_share_transaction ON share_transactions;
CREATE TRIGGER trigger_process_share_transaction
  AFTER UPDATE ON share_transactions
  FOR EACH ROW
  EXECUTE FUNCTION process_share_transaction();

-- Step 3: Function to convert bookings to purchases
CREATE OR REPLACE FUNCTION convert_booking_to_purchase(p_booking_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_record RECORD;
  transaction_id UUID;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record FROM share_bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  IF booking_record.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not yet completed');
  END IF;
  
  -- Create purchase transaction
  INSERT INTO share_transactions (
    user_id, share_id, transaction_type, quantity, price_per_share, 
    total_amount, currency, status, booking_reference
  ) VALUES (
    booking_record.user_id,
    booking_record.share_id,
    'purchase',
    booking_record.quantity,
    booking_record.booked_price_per_share,
    booking_record.total_amount,
    booking_record.currency,
    'completed',
    p_booking_id
  ) RETURNING id INTO transaction_id;
  
  -- Update booking status
  UPDATE share_bookings SET
    status = 'converted_to_purchase',
    updated_at = now()
  WHERE id = p_booking_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'transaction_id', transaction_id,
    'message', 'Booking successfully converted to purchase'
  );
END;
$$;

-- Step 4: Data integrity validation function  
CREATE OR REPLACE FUNCTION validate_share_transaction_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_user_shares NUMERIC;
  total_issued_shares NUMERIC;
  available_shares NUMERIC;
  issues jsonb := '[]';
BEGIN
  -- Calculate total shares held by users
  SELECT COALESCE(SUM(quantity), 0) INTO total_user_shares 
  FROM user_shares WHERE quantity > 0;
  
  -- Get total issued and available shares
  SELECT 
    COALESCE(total_shares, 0),
    COALESCE(available_shares, 0)
  INTO total_issued_shares, available_shares
  FROM shares LIMIT 1;
  
  -- Check if user holdings + available = total issued
  IF total_user_shares + available_shares != total_issued_shares THEN
    issues := jsonb_set(issues, ARRAY[jsonb_array_length(issues)::text], 
      jsonb_build_object(
        'type', 'share_balance_mismatch',
        'description', 'User holdings + available shares != total issued shares',
        'user_shares', total_user_shares,
        'available_shares', available_shares,
        'total_issued', total_issued_shares,
        'difference', total_issued_shares - (total_user_shares + available_shares)
      )
    );
  END IF;
  
  -- Check for negative holdings
  FOR r IN SELECT user_id, quantity FROM user_shares WHERE quantity < 0 LOOP
    issues := jsonb_set(issues, ARRAY[jsonb_array_length(issues)::text],
      jsonb_build_object(
        'type', 'negative_holdings',
        'user_id', r.user_id,
        'quantity', r.quantity
      )
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_issues', jsonb_array_length(issues),
    'issues', issues,
    'summary', jsonb_build_object(
      'total_user_shares', total_user_shares,
      'available_shares', available_shares,
      'total_issued_shares', total_issued_shares
    )
  );
END;
$$;
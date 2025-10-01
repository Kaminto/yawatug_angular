-- Fix the submit_sell_order function to use correct column names
DROP FUNCTION IF EXISTS submit_sell_order(uuid, uuid, integer, text);

CREATE OR REPLACE FUNCTION submit_sell_order(
  p_user_id UUID,
  p_share_id UUID,
  p_quantity INTEGER,
  p_order_type TEXT DEFAULT 'market'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_current_price NUMERIC;
  v_fifo_position INTEGER;
  v_user_holdings INTEGER;
BEGIN
  -- Get current share price
  SELECT price_per_share INTO v_current_price
  FROM shares
  WHERE id = p_share_id;
  
  IF v_current_price IS NULL THEN
    RAISE EXCEPTION 'Share not found';
  END IF;
  
  -- Check user holdings from user_shares table
  SELECT COALESCE(SUM(quantity), 0) INTO v_user_holdings
  FROM user_shares
  WHERE user_id = p_user_id 
    AND share_id = p_share_id;
    
  IF v_user_holdings < p_quantity THEN
    RAISE EXCEPTION 'Insufficient shares. You have % shares available', v_user_holdings;
  END IF;
  
  -- Get next FIFO position
  SELECT COALESCE(MAX(fifo_position), 0) + 1 INTO v_fifo_position
  FROM share_sell_orders
  WHERE status IN ('pending', 'partial');
  
  -- Create sell order with correct column names
  INSERT INTO share_sell_orders (
    user_id,
    share_id,
    quantity,
    original_quantity,
    remaining_quantity,
    requested_price,
    current_market_price,
    order_type,
    status,
    priority_level,
    fifo_position,
    processed_quantity,
    modification_count,
    total_sell_value
  ) VALUES (
    p_user_id,
    p_share_id,
    p_quantity,
    p_quantity,
    p_quantity,
    v_current_price,
    v_current_price,
    p_order_type,
    'pending',
    1,
    v_fifo_position,
    0,
    0,
    p_quantity * v_current_price
  ) RETURNING id INTO v_order_id;
  
  RETURN v_order_id;
END;
$$;
-- Fix the remaining recursion issue by making submit_sell_order completely bypass RLS
-- The issue is that the function still queries share_sell_orders which triggers RLS policies

DROP FUNCTION IF EXISTS submit_sell_order(UUID, UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION submit_sell_order(
  p_user_id UUID,
  p_share_id UUID, 
  p_quantity INTEGER,
  p_order_type TEXT DEFAULT 'market'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_current_price NUMERIC;
  v_fifo_position INTEGER;
  v_user_holdings INTEGER;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_share_id IS NULL OR p_quantity IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters provided';
  END IF;
  
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  
  -- Get current share price (bypasses RLS due to SECURITY DEFINER)
  SELECT price_per_share INTO v_current_price
  FROM shares
  WHERE id = p_share_id;
  
  IF v_current_price IS NULL THEN
    RAISE EXCEPTION 'Share not found';
  END IF;
  
  -- Check user holdings (bypasses RLS due to SECURITY DEFINER)
  SELECT COALESCE(SUM(quantity), 0) INTO v_user_holdings
  FROM user_shares
  WHERE user_id = p_user_id 
    AND share_id = p_share_id;
    
  IF v_user_holdings < p_quantity THEN
    RAISE EXCEPTION 'Insufficient shares. You have % shares available', v_user_holdings;
  END IF;
  
  -- Get next FIFO position (bypasses RLS due to SECURITY DEFINER)
  SELECT COALESCE(MAX(fifo_position), 0) + 1 INTO v_fifo_position
  FROM share_sell_orders
  WHERE status IN ('pending', 'partial');
  
  -- Generate UUID for the new order
  v_order_id := gen_random_uuid();
  
  -- Insert the sell order directly (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO share_sell_orders (
    id, user_id, share_id, quantity, original_quantity, remaining_quantity,
    requested_price, current_market_price, order_type, status, priority_level,
    fifo_position, processed_quantity, modification_count, created_at, updated_at
  ) VALUES (
    v_order_id, p_user_id, p_share_id, p_quantity, p_quantity, p_quantity,
    v_current_price, v_current_price, p_order_type, 'pending', 1,
    v_fifo_position, 0, 0, now(), now()
  );
  
  RETURN v_order_id;
END;
$$;
-- Simplify submit_sell_order to just check total held shares
-- Pending sell orders reserve shares, pending buy orders are irrelevant to selling
CREATE OR REPLACE FUNCTION public.submit_sell_order(
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
  v_total_held_shares INTEGER := 0;
  v_pending_sell_orders INTEGER := 0;
  v_available_to_sell INTEGER := 0;
  v_total_sell_value NUMERIC;
  v_estimated_fees NUMERIC;
  v_net_proceeds NUMERIC;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_share_id IS NULL OR p_quantity IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters provided';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  -- Get current share price
  SELECT price_per_share INTO v_current_price
  FROM shares
  WHERE id = p_share_id;
  IF v_current_price IS NULL THEN
    RAISE EXCEPTION 'Share not found';
  END IF;

  -- Get total shares user owns (all unlocked shares)
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_held_shares
  FROM user_shares
  WHERE user_id = p_user_id 
    AND share_id = p_share_id
    AND COALESCE(is_locked, false) = false;

  -- Get shares already in pending/partial SELL orders (these are reserved)
  SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_pending_sell_orders
  FROM share_sell_orders
  WHERE user_id = p_user_id 
    AND share_id = p_share_id 
    AND status IN ('pending', 'partial');

  -- Available to sell = total held - already pending for sale
  v_available_to_sell := v_total_held_shares - v_pending_sell_orders;

  IF v_available_to_sell < p_quantity THEN
    RAISE EXCEPTION 'Insufficient shares available to sell. You have % shares, but % are already in pending sell orders. Available: %',
      v_total_held_shares, v_pending_sell_orders, v_available_to_sell;
  END IF;

  -- Calculate financials
  v_total_sell_value := v_current_price * p_quantity;
  SELECT COALESCE(
    (SELECT percentage_fee FROM transaction_fee_settings 
     WHERE transaction_type = 'share_sell' AND is_active = true 
     ORDER BY created_at DESC LIMIT 1),
    2.5
  ) * v_total_sell_value / 100 INTO v_estimated_fees;
  v_net_proceeds := v_total_sell_value - v_estimated_fees;

  -- Get FIFO position
  SELECT COALESCE(MAX(fifo_position), 0) + 1 INTO v_fifo_position
  FROM share_sell_orders
  WHERE status IN ('pending', 'partial');

  -- Create order
  v_order_id := gen_random_uuid();
  INSERT INTO share_sell_orders (
    id, user_id, share_id, quantity, original_quantity, remaining_quantity,
    requested_price, current_market_price, order_type, status, priority_level,
    fifo_position, processed_quantity, modification_count,
    total_sell_value, estimated_fees, net_proceeds,
    market_conditions_at_submission,
    created_at, updated_at
  ) VALUES (
    v_order_id, p_user_id, p_share_id, p_quantity, p_quantity, p_quantity,
    v_current_price, v_current_price, p_order_type, 'pending', 1,
    v_fifo_position, 0, 0,
    v_total_sell_value, v_estimated_fees, v_net_proceeds,
    jsonb_build_object(
      'total_held_shares', v_total_held_shares,
      'pending_sell_orders', v_pending_sell_orders,
      'available_to_sell', v_available_to_sell,
      'submission_timestamp', now()
    ),
    now(), now()
  );

  -- Usage tracking
  INSERT INTO user_selling_usage (
    user_id, share_id, quantity, order_type, 
    usage_date, usage_period, created_at
  ) VALUES 
    (p_user_id, p_share_id, p_quantity, 'market', CURRENT_DATE, 'daily', now()),
    (p_user_id, p_share_id, p_quantity, 'market', date_trunc('week', CURRENT_DATE), 'weekly', now()),
    (p_user_id, p_share_id, p_quantity, 'market', date_trunc('month', CURRENT_DATE), 'monthly', now())
  ON CONFLICT (user_id, share_id, usage_date, usage_period) 
  DO UPDATE SET 
    quantity = user_selling_usage.quantity + EXCLUDED.quantity,
    updated_at = now();

  RETURN v_order_id;
END;
$$;

-- Drop the get_sellable_shares function since we're simplifying
DROP FUNCTION IF EXISTS public.get_sellable_shares(UUID, UUID);
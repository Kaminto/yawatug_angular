-- Refine available shares logic: ignore buy bookings, use unlocked holdings minus pending sells and transfers
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
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_current_price NUMERIC;
  v_fifo_position INTEGER;
  v_unlocked_direct_holdings INTEGER := 0;
  v_pending_sell_quantity INTEGER := 0;
  v_in_transfer_quantity INTEGER := 0;
  v_available_shares INTEGER := 0;
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

  -- Unlocked direct holdings only (do not count locked lots)
  SELECT COALESCE(SUM(quantity), 0) INTO v_unlocked_direct_holdings
  FROM user_shares
  WHERE user_id = p_user_id 
    AND share_id = p_share_id
    AND COALESCE(is_locked, false) = false;

  -- Shares already committed in pending/partial sell orders
  SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_pending_sell_quantity
  FROM share_sell_orders
  WHERE user_id = p_user_id 
    AND share_id = p_share_id 
    AND status IN ('pending', 'partial');

  -- Shares in transfer-out requests (pending/approved) if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'share_transfer_requests'
  ) THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_in_transfer_quantity
    FROM share_transfer_requests
    WHERE sender_id = p_user_id
      AND share_id = p_share_id
      AND status IN ('pending','approved');
  ELSE
    v_in_transfer_quantity := 0;
  END IF;

  -- Calculate true available amount to sell
  v_available_shares := v_unlocked_direct_holdings - v_pending_sell_quantity - v_in_transfer_quantity;

  IF v_available_shares < p_quantity THEN
    RAISE EXCEPTION 'Cannot sell more shares than available. You have % shares available (% pending sell, % pending transfer)',
      GREATEST(v_available_shares, 0), v_pending_sell_quantity, v_in_transfer_quantity;
  END IF;

  -- Financials
  v_total_sell_value := v_current_price * p_quantity;
  SELECT COALESCE(
    (SELECT percentage_fee FROM transaction_fee_settings 
     WHERE transaction_type = 'share_sell' AND is_active = true 
     ORDER BY created_at DESC LIMIT 1),
    2.5
  ) * v_total_sell_value / 100 INTO v_estimated_fees;
  v_net_proceeds := v_total_sell_value - v_estimated_fees;

  -- FIFO position
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
      'share_price_at_submission', v_current_price,
      'unlocked_direct_holdings', v_unlocked_direct_holdings,
      'shares_in_pending_sells', v_pending_sell_quantity,
      'shares_in_transfers', v_in_transfer_quantity,
      'available_shares_calculated', v_available_shares,
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
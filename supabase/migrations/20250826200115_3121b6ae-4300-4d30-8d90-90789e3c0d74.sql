-- Fix the submit_sell_order function to use correct column names
CREATE OR REPLACE FUNCTION public.submit_sell_order(
  p_user_id UUID,
  p_share_id UUID,
  p_quantity INTEGER,
  p_order_type TEXT DEFAULT 'market',
  p_requested_price NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_share_price NUMERIC;
  v_total_value NUMERIC;
  v_fee_amount NUMERIC := 0;
  v_net_amount NUMERIC;
  v_fifo_position INTEGER;
BEGIN
  -- Get current share price
  SELECT price_per_share INTO v_share_price
  FROM public.shares
  WHERE id = p_share_id;
  
  IF v_share_price IS NULL THEN
    RAISE EXCEPTION 'Share not found';
  END IF;
  
  -- Calculate values
  v_total_value := v_share_price * p_quantity;
  
  -- For now, set fee to 0 (can be updated later with proper fee calculation)
  v_fee_amount := 0;
  v_net_amount := v_total_value - v_fee_amount;
  
  -- Get next FIFO position
  SELECT COALESCE(MAX(fifo_position), 0) + 1 INTO v_fifo_position
  FROM public.share_sell_orders
  WHERE status = 'pending';
  
  -- Insert sell order using correct column names
  INSERT INTO public.share_sell_orders (
    user_id,
    share_id,
    quantity,
    order_type,
    requested_price,
    total_sell_value,
    estimated_fees,
    net_proceeds,
    fifo_position,
    status,
    original_quantity,
    remaining_quantity
  ) VALUES (
    p_user_id,
    p_share_id,
    p_quantity,
    p_order_type,
    COALESCE(p_requested_price, v_share_price),
    v_total_value,
    v_fee_amount,
    v_net_amount,
    v_fifo_position,
    'pending',
    p_quantity,
    p_quantity
  ) RETURNING id INTO v_order_id;
  
  RETURN v_order_id;
END;
$$;
-- Fix the submit_sell_order function to exclude generated columns
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
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_order_id UUID;
  v_share_price NUMERIC;
  v_fee_amount NUMERIC := 0;
  v_net_amount NUMERIC;
  v_fifo_position INTEGER;
  v_final_price NUMERIC;
BEGIN
  -- Get current share price
  SELECT price_per_share INTO v_share_price
  FROM public.shares
  WHERE id = p_share_id;
  
  IF v_share_price IS NULL THEN
    RAISE EXCEPTION 'Share not found';
  END IF;
  
  -- Use requested price or fall back to current market price
  v_final_price := COALESCE(p_requested_price, v_share_price);
  
  -- Calculate net amount (total_sell_value will be auto-generated)
  v_fee_amount := 0; -- For now, set fee to 0
  v_net_amount := (v_final_price * p_quantity) - v_fee_amount;
  
  -- Get next FIFO position
  SELECT COALESCE(MAX(fifo_position), 0) + 1 INTO v_fifo_position
  FROM public.share_sell_orders
  WHERE status = 'pending';
  
  -- Insert sell order (excluding generated columns)
  INSERT INTO public.share_sell_orders (
    user_id,
    share_id,
    quantity,
    order_type,
    requested_price,
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
    v_final_price,
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
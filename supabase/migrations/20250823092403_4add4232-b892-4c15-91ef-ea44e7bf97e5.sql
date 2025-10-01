-- Fix submit_sell_order function to handle total_sell_value properly
CREATE OR REPLACE FUNCTION public.submit_sell_order(
  p_user_id uuid,
  p_share_id uuid,
  p_quantity integer,
  p_order_type text DEFAULT 'market'::text,
  p_requested_price numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_id uuid;
  current_price numeric;
  calculated_total_value numeric;
  next_fifo_position integer;
BEGIN
  -- Get current share price
  SELECT price_per_share INTO current_price
  FROM public.shares 
  WHERE id = p_share_id;
  
  IF current_price IS NULL THEN
    RAISE EXCEPTION 'Share not found or price not available';
  END IF;
  
  -- Calculate total sell value
  calculated_total_value := current_price * p_quantity;
  
  -- Get next FIFO position
  SELECT COALESCE(MAX(fifo_position), 0) + 1 INTO next_fifo_position
  FROM public.share_sell_orders
  WHERE status IN ('pending', 'partial');
  
  -- Insert sell order with calculated total_sell_value
  INSERT INTO public.share_sell_orders (
    user_id,
    share_id,
    quantity,
    price_per_share,
    total_sell_value,
    order_type,
    requested_price,
    status,
    fifo_position
  ) VALUES (
    p_user_id,
    p_share_id,
    p_quantity,
    current_price,
    calculated_total_value,
    p_order_type,
    COALESCE(p_requested_price, current_price),
    'pending',
    next_fifo_position
  ) RETURNING id INTO order_id;
  
  -- Update selling usage tracking
  INSERT INTO public.user_selling_usage (
    user_id,
    quantity,
    usage_period,
    usage_date,
    sell_order_id
  ) VALUES 
  (p_user_id, p_quantity, 'daily', CURRENT_DATE, order_id),
  (p_user_id, p_quantity, 'weekly', date_trunc('week', CURRENT_DATE), order_id),
  (p_user_id, p_quantity, 'monthly', date_trunc('month', CURRENT_DATE), order_id);
  
  RETURN order_id;
END;
$$;
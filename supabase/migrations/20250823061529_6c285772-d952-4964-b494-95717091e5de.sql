-- Fix the recursion by making is_admin function SECURITY DEFINER
-- This allows it to bypass RLS when checking user roles
DROP FUNCTION IF EXISTS is_admin(uuid);

CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id 
    AND (user_role = 'admin' OR user_type = 'admin')
  );
END;
$$;

-- Also fix get_current_user_role function to be SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql 
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (SELECT user_role FROM public.profiles WHERE id = auth.uid());
END;
$$;

-- Now revert submit_sell_order back to a simpler, secure version
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
  -- Validate inputs
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  
  -- Get current share price
  SELECT price_per_share INTO v_current_price
  FROM public.shares
  WHERE id = p_share_id;
  
  IF v_current_price IS NULL THEN
    RAISE EXCEPTION 'Share not found';
  END IF;
  
  -- Check user holdings
  SELECT COALESCE(SUM(quantity), 0) INTO v_user_holdings
  FROM public.user_shares
  WHERE user_id = p_user_id 
    AND share_id = p_share_id;
    
  IF v_user_holdings < p_quantity THEN
    RAISE EXCEPTION 'Insufficient shares. You have % shares available', v_user_holdings;
  END IF;
  
  -- Get next FIFO position
  SELECT COALESCE(MAX(fifo_position), 0) + 1 INTO v_fifo_position
  FROM public.share_sell_orders
  WHERE status IN ('pending', 'partial');
  
  -- Insert the sell order using normal INSERT (RLS will work now)
  INSERT INTO public.share_sell_orders (
    user_id, share_id, quantity, original_quantity, remaining_quantity,
    requested_price, current_market_price, order_type, status, priority_level,
    fifo_position, processed_quantity, modification_count
  ) VALUES (
    p_user_id, p_share_id, p_quantity, p_quantity, p_quantity,
    v_current_price, v_current_price, p_order_type, 'pending', 1,
    v_fifo_position, 0, 0
  ) RETURNING id INTO v_order_id;
  
  RETURN v_order_id;
END;
$$;
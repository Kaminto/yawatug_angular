-- Create a unified function to compute sellable shares used by UI and backend
CREATE OR REPLACE FUNCTION public.get_sellable_shares(
  p_user_id UUID,
  p_share_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocked_direct_holdings INTEGER := 0;
  v_pending_sell_quantity INTEGER := 0;
  v_in_transfer_quantity INTEGER := 0;
BEGIN
  -- Unlocked direct holdings only
  SELECT COALESCE(SUM(quantity), 0) INTO v_unlocked_direct_holdings
  FROM user_shares
  WHERE user_id = p_user_id
    AND share_id = p_share_id
    AND COALESCE(is_locked, false) = false;
  
  -- Pending/partial sell orders already reserving shares
  SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_pending_sell_quantity
  FROM share_sell_orders
  WHERE user_id = p_user_id
    AND share_id = p_share_id
    AND status IN ('pending','partial');
  
  -- Outgoing share transfers that will reduce holdings
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
  
  RETURN GREATEST(v_unlocked_direct_holdings - v_pending_sell_quantity - v_in_transfer_quantity, 0);
END;
$$;
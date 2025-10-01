-- Fix the trigger function to use SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION update_sell_order_fifo_positions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update FIFO positions for pending orders
    -- Using SECURITY DEFINER to bypass RLS and prevent recursion
    WITH numbered_orders AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_position
        FROM share_sell_orders 
        WHERE status = 'pending'
    )
    UPDATE share_sell_orders 
    SET fifo_position = numbered_orders.new_position,
        updated_at = now()
    FROM numbered_orders 
    WHERE share_sell_orders.id = numbered_orders.id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;
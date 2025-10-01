-- Drop the problematic trigger temporarily to see if it's causing the recursion
DROP TRIGGER IF EXISTS update_sell_order_fifo_positions_trigger ON share_sell_orders;
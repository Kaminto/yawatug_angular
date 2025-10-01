-- Share Pool Relationship Restoration Migration
-- This migration creates comprehensive triggers and functions to maintain proper share pool relationships

-- 1. Create function to calculate available shares dynamically
CREATE OR REPLACE FUNCTION calculate_available_shares(p_share_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_shares_count numeric;
  sold_shares_count numeric;
  reserved_shares_count numeric;
  available_count numeric;
BEGIN
  -- Get total shares for this share pool
  SELECT total_shares INTO total_shares_count
  FROM shares WHERE id = p_share_id;
  
  IF total_shares_count IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate sold shares (direct holdings + progressive bookings)
  SELECT COALESCE(SUM(quantity), 0) INTO sold_shares_count
  FROM user_shares WHERE share_id = p_share_id;
  
  -- Add progressive shares from active bookings
  SELECT COALESCE(SUM(COALESCE(shares_owned_progressively, 0)), 0) 
  INTO reserved_shares_count
  FROM share_bookings 
  WHERE share_id = p_share_id AND status IN ('active', 'partially_paid');
  
  -- Calculate actual reserved shares (admin issued shares)
  -- This should be based on share reserve settings if they exist
  -- For now, we'll use a simple 10% reserve
  reserved_shares_count := reserved_shares_count + (total_shares_count * 0.1);
  
  -- Calculate available shares
  available_count := total_shares_count - sold_shares_count - reserved_shares_count;
  
  -- Ensure we don't go negative
  available_count := GREATEST(available_count, 0);
  
  RETURN available_count;
END;
$$;

-- 2. Create function to update share availability
CREATE OR REPLACE FUNCTION update_share_availability(p_share_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_available_count numeric;
BEGIN
  -- Calculate new available shares
  new_available_count := calculate_available_shares(p_share_id);
  
  -- Update the shares table
  UPDATE shares 
  SET available_shares = new_available_count,
      updated_at = now()
  WHERE id = p_share_id;
END;
$$;

-- 3. Create trigger function for user_shares changes
CREATE OR REPLACE FUNCTION trigger_update_share_availability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM update_share_availability(NEW.share_id);
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    PERFORM update_share_availability(OLD.share_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 4. Create trigger function for share_bookings changes
CREATE OR REPLACE FUNCTION trigger_update_share_availability_bookings()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM update_share_availability(NEW.share_id);
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    PERFORM update_share_availability(OLD.share_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 5. Create triggers on user_shares table
DROP TRIGGER IF EXISTS trigger_user_shares_availability ON user_shares;
CREATE TRIGGER trigger_user_shares_availability
  AFTER INSERT OR UPDATE OR DELETE ON user_shares
  FOR EACH ROW EXECUTE FUNCTION trigger_update_share_availability();

-- 6. Create triggers on share_bookings table
DROP TRIGGER IF EXISTS trigger_share_bookings_availability ON share_bookings;
CREATE TRIGGER trigger_share_bookings_availability
  AFTER INSERT OR UPDATE OR DELETE ON share_bookings
  FOR EACH ROW EXECUTE FUNCTION trigger_update_share_availability_bookings();

-- 7. Create function to process buyback orders and return shares to pool
CREATE OR REPLACE FUNCTION process_buyback_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_record RECORD;
  user_holding_record RECORD;
  result jsonb;
BEGIN
  -- Get the buyback order
  SELECT * INTO order_record
  FROM share_buyback_orders 
  WHERE id = p_order_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found or already processed');
  END IF;
  
  -- Check if user has enough shares
  SELECT * INTO user_holding_record
  FROM user_shares
  WHERE user_id = order_record.user_id 
    AND share_id = order_record.share_id
    AND quantity >= order_record.quantity;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient shares');
  END IF;
  
  -- Begin transaction
  BEGIN
    -- Update user shares (reduce quantity)
    UPDATE user_shares 
    SET quantity = quantity - order_record.quantity,
        updated_at = now()
    WHERE id = user_holding_record.id;
    
    -- If quantity becomes 0, delete the record
    DELETE FROM user_shares 
    WHERE id = user_holding_record.id AND quantity = 0;
    
    -- Update buyback order status
    UPDATE share_buyback_orders
    SET status = 'completed',
        processed_at = now(),
        updated_at = now()
    WHERE id = p_order_id;
    
    -- The trigger will automatically update available_shares
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Buyback order processed successfully',
      'shares_returned', order_record.quantity
    );
    
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
  
  RETURN result;
END;
$$;

-- 8. Create function to reconcile share pools (fix any inconsistencies)
CREATE OR REPLACE FUNCTION reconcile_share_pools()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  share_record RECORD;
  reconciliation_count integer := 0;
  result jsonb;
BEGIN
  -- Update all share pools
  FOR share_record IN SELECT id FROM shares LOOP
    PERFORM update_share_availability(share_record.id);
    reconciliation_count := reconciliation_count + 1;
  END LOOP;
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Share pools reconciled successfully',
    'pools_updated', reconciliation_count
  );
  
  RETURN result;
END;
$$;

-- 9. Add constraints to prevent data integrity issues
ALTER TABLE shares 
ADD CONSTRAINT check_available_shares_not_negative 
CHECK (available_shares >= 0);

ALTER TABLE shares 
ADD CONSTRAINT check_available_shares_not_exceed_total 
CHECK (available_shares <= total_shares);

-- 10. Create function to validate share purchase
CREATE OR REPLACE FUNCTION validate_share_purchase(p_share_id uuid, p_quantity numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_available numeric;
  result jsonb;
BEGIN
  -- Get current available shares
  current_available := calculate_available_shares(p_share_id);
  
  IF current_available >= p_quantity THEN
    result := jsonb_build_object(
      'valid', true,
      'available_shares', current_available
    );
  ELSE
    result := jsonb_build_object(
      'valid', false,
      'available_shares', current_available,
      'error', 'Insufficient shares available'
    );
  END IF;
  
  RETURN result;
END;
$$;

-- 11. Run initial reconciliation to fix existing data
SELECT reconcile_share_pools();
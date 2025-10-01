-- Drop old functions that work on wrong table
DROP FUNCTION IF EXISTS public.cancel_booking_order(UUID, UUID);
DROP FUNCTION IF EXISTS public.reduce_booking_quantity(UUID, INTEGER, UUID);

-- Function to cancel booking - only cancels unpaid portion
CREATE OR REPLACE FUNCTION public.cancel_booking_order(
  p_booking_id UUID,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record RECORD;
  shares_paid INTEGER := 0;
  shares_unpaid INTEGER := 0;
  amount_per_share NUMERIC;
  new_quantity INTEGER;
  new_total_amount NUMERIC;
  new_remaining_amount NUMERIC;
BEGIN
  -- Get booking details from share_bookings
  SELECT * INTO booking_record
  FROM public.share_bookings
  WHERE id = p_booking_id AND user_id = p_user_id AND status IN ('active', 'partially_paid', 'pending');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found or cannot be cancelled');
  END IF;
  
  -- Calculate shares already paid (owned progressively)
  shares_paid := COALESCE(booking_record.shares_owned_progressively, 0);
  shares_unpaid := booking_record.quantity - shares_paid;
  
  -- If all shares are paid, cannot cancel
  IF shares_unpaid <= 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Cannot cancel - all shares are already paid. You own ' || shares_paid || ' shares.'
    );
  END IF;
  
  -- If partially paid, reduce to paid quantity instead of full cancel
  IF shares_paid > 0 THEN
    amount_per_share := booking_record.booked_price_per_share;
    new_quantity := shares_paid;
    new_total_amount := amount_per_share * new_quantity;
    new_remaining_amount := 0; -- All paid
    
    -- Update booking to keep only paid shares
    UPDATE public.share_bookings
    SET quantity = new_quantity,
        total_amount = new_total_amount,
        remaining_amount = new_remaining_amount,
        status = 'completed', -- Mark as completed since fully paid
        updated_at = now()
    WHERE id = p_booking_id;
    
    -- Release unpaid shares back to pool
    UPDATE public.shares
    SET available_shares = available_shares + shares_unpaid
    WHERE id = booking_record.share_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'cancelled_shares', shares_unpaid,
      'kept_shares', shares_paid,
      'message', 'Cancelled ' || shares_unpaid || ' unpaid shares. Kept ' || shares_paid || ' paid shares.'
    );
  ELSE
    -- Fully cancel if nothing paid
    UPDATE public.share_bookings
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = p_booking_id;
    
    -- Release all shares back to pool
    UPDATE public.shares
    SET available_shares = available_shares + booking_record.quantity
    WHERE id = booking_record.share_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'cancelled_shares', booking_record.quantity,
      'kept_shares', 0,
      'message', 'Booking cancelled successfully'
    );
  END IF;
END;
$$;

-- Function to reduce booking quantity - cannot reduce below paid shares
CREATE OR REPLACE FUNCTION public.reduce_booking_quantity(
  p_booking_id UUID,
  p_new_quantity INTEGER,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record RECORD;
  shares_paid INTEGER := 0;
  amount_per_share NUMERIC;
  new_total_amount NUMERIC;
  new_remaining_amount NUMERIC;
  shares_released INTEGER;
BEGIN
  -- Get booking details from share_bookings
  SELECT * INTO booking_record
  FROM public.share_bookings
  WHERE id = p_booking_id AND user_id = p_user_id AND status IN ('active', 'partially_paid', 'pending');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found or cannot be modified');
  END IF;
  
  -- Calculate shares already paid
  shares_paid := COALESCE(booking_record.shares_owned_progressively, 0);
  
  -- Validate new quantity
  IF p_new_quantity <= shares_paid THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Cannot reduce below ' || shares_paid || ' shares - you already own them through payments'
    );
  END IF;
  
  IF p_new_quantity >= booking_record.quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'New quantity must be less than current quantity');
  END IF;
  
  -- Calculate new amounts
  amount_per_share := booking_record.booked_price_per_share;
  new_total_amount := amount_per_share * p_new_quantity;
  new_remaining_amount := new_total_amount - COALESCE(booking_record.cumulative_payments, 0);
  shares_released := booking_record.quantity - p_new_quantity;
  
  -- Update booking
  UPDATE public.share_bookings
  SET quantity = p_new_quantity,
      total_amount = new_total_amount,
      remaining_amount = GREATEST(0, new_remaining_amount),
      payment_percentage = CASE 
        WHEN new_total_amount > 0 THEN (COALESCE(booking_record.cumulative_payments, 0) / new_total_amount) * 100
        ELSE 0
      END,
      updated_at = now()
  WHERE id = p_booking_id;
  
  -- Release reduced shares back to pool
  UPDATE public.shares
  SET available_shares = available_shares + shares_released
  WHERE id = booking_record.share_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_quantity', p_new_quantity,
    'shares_released', shares_released,
    'owned_shares', shares_paid,
    'message', 'Booking reduced to ' || p_new_quantity || ' shares. ' || shares_released || ' shares released.'
  );
END;
$$;
-- Update the process_booking_payment function to create user_shares records for unlocked shares
CREATE OR REPLACE FUNCTION process_booking_payment(
  p_booking_id UUID,
  p_payment_amount NUMERIC,
  p_user_id UUID,
  p_transaction_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
  v_new_cumulative_payments NUMERIC;
  v_new_payment_percentage NUMERIC;
  v_shares_to_unlock INTEGER;
  v_new_shares_owned_progressively INTEGER;
  v_booking_completed BOOLEAN := FALSE;
  v_new_status TEXT;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM share_bookings 
  WHERE id = p_booking_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  -- Calculate new payment amounts
  v_new_cumulative_payments := COALESCE(v_booking.cumulative_payments, 0) + p_payment_amount;
  v_new_payment_percentage := (v_new_cumulative_payments / v_booking.total_amount) * 100;
  
  -- Calculate shares to unlock based on payment percentage
  v_shares_to_unlock := FLOOR((v_new_payment_percentage / 100) * v_booking.quantity) - COALESCE(v_booking.shares_owned_progressively, 0);
  v_new_shares_owned_progressively := COALESCE(v_booking.shares_owned_progressively, 0) + v_shares_to_unlock;
  
  -- Check if booking is completed
  IF v_new_cumulative_payments >= v_booking.total_amount THEN
    v_booking_completed := TRUE;
    v_new_status := 'completed';
    v_new_shares_owned_progressively := v_booking.quantity; -- Ensure all shares are owned
    v_shares_to_unlock := v_booking.quantity - COALESCE(v_booking.shares_owned_progressively, 0); -- Unlock remaining shares
  ELSE
    v_new_status := 'partially_paid';
  END IF;
  
  -- Update the booking
  UPDATE share_bookings 
  SET 
    cumulative_payments = v_new_cumulative_payments,
    payment_percentage = v_new_payment_percentage,
    shares_owned_progressively = v_new_shares_owned_progressively,
    remaining_amount = v_booking.total_amount - v_new_cumulative_payments,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  -- Create or update user_shares record for the unlocked shares
  IF v_shares_to_unlock > 0 THEN
    -- Check if user already has shares for this share_id
    INSERT INTO user_shares (
      user_id,
      share_id,
      quantity,
      purchase_price_per_share,
      currency,
      booking_id,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      v_booking.share_id,
      v_shares_to_unlock,
      v_booking.booked_price_per_share,
      v_booking.currency,
      p_booking_id,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, share_id, booking_id) 
    DO UPDATE SET 
      quantity = user_shares.quantity + v_shares_to_unlock,
      updated_at = NOW();
  END IF;
  
  -- Record the payment transaction
  INSERT INTO user_transactions (
    user_id,
    transaction_type,
    amount,
    currency,
    reference_id,
    description,
    status,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    'booking_payment',
    p_payment_amount,
    v_booking.currency,
    p_transaction_id,
    'Payment for share booking #' || p_booking_id,
    'completed',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'shares_unlocked', v_shares_to_unlock,
      'payment_percentage', v_new_payment_percentage
    ),
    NOW(),
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'shares_unlocked', v_shares_to_unlock,
    'total_shares_owned', v_new_shares_owned_progressively,
    'payment_percentage', v_new_payment_percentage,
    'remaining_balance', v_booking.total_amount - v_new_cumulative_payments,
    'booking_completed', v_booking_completed,
    'new_status', v_new_status
  );
END;
$$ LANGUAGE plpgsql;
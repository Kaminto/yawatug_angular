-- Function to cancel a booking order and refund payments
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
  refund_amount NUMERIC := 0;
  wallet_id UUID;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record
  FROM public.share_purchase_orders
  WHERE id = p_booking_id AND user_id = p_user_id AND status IN ('active', 'partially_paid');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found or cannot be cancelled');
  END IF;
  
  -- Calculate refund amount
  refund_amount := COALESCE(booking_record.cumulative_payments, 0);
  
  -- Get user wallet
  SELECT id INTO wallet_id
  FROM public.wallets
  WHERE user_id = p_user_id AND currency = 'UGX';
  
  -- Refund to wallet if there were payments
  IF refund_amount > 0 AND wallet_id IS NOT NULL THEN
    UPDATE public.wallets
    SET balance = balance + refund_amount,
        updated_at = now()
    WHERE id = wallet_id;
    
    -- Record refund transaction
    INSERT INTO public.transactions (
      wallet_id, transaction_type, amount, currency, status, description
    ) VALUES (
      wallet_id, 'refund', refund_amount, 'UGX', 'completed',
      'Booking cancellation refund for ' || booking_record.quantity || ' shares'
    );
  END IF;
  
  -- Update booking status
  UPDATE public.share_purchase_orders
  SET status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_booking_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'refund_amount', refund_amount,
    'message', 'Booking cancelled successfully'
  );
END;
$$;

-- Function to reduce booking quantity
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
  price_per_share NUMERIC;
  new_total_amount NUMERIC;
  excess_payment NUMERIC := 0;
  wallet_id UUID;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record
  FROM public.share_purchase_orders
  WHERE id = p_booking_id AND user_id = p_user_id AND status IN ('active', 'partially_paid');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found or cannot be modified');
  END IF;
  
  IF p_new_quantity <= 0 OR p_new_quantity >= booking_record.quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'New quantity must be less than current quantity');
  END IF;
  
  -- Calculate new amounts
  price_per_share := booking_record.total_amount / booking_record.quantity;
  new_total_amount := price_per_share * p_new_quantity;
  
  -- Calculate excess payment to refund
  IF booking_record.cumulative_payments > new_total_amount THEN
    excess_payment := booking_record.cumulative_payments - new_total_amount;
  END IF;
  
  -- Get user wallet
  SELECT id INTO wallet_id
  FROM public.wallets
  WHERE user_id = p_user_id AND currency = 'UGX';
  
  -- Refund excess payment if any
  IF excess_payment > 0 AND wallet_id IS NOT NULL THEN
    UPDATE public.wallets
    SET balance = balance + excess_payment,
        updated_at = now()
    WHERE id = wallet_id;
    
    -- Record refund transaction
    INSERT INTO public.transactions (
      wallet_id, transaction_type, amount, currency, status, description
    ) VALUES (
      wallet_id, 'refund', excess_payment, 'UGX', 'completed',
      'Excess payment refund from booking quantity reduction'
    );
  END IF;
  
  -- Update booking with new quantity and amounts
  UPDATE public.share_purchase_orders
  SET quantity = p_new_quantity,
      total_amount = new_total_amount,
      remaining_amount = GREATEST(0, new_total_amount - LEAST(booking_record.cumulative_payments, new_total_amount)),
      cumulative_payments = LEAST(booking_record.cumulative_payments, new_total_amount),
      payment_percentage = CASE 
        WHEN new_total_amount > 0 THEN (LEAST(booking_record.cumulative_payments, new_total_amount) / new_total_amount) * 100
        ELSE 0
      END,
      updated_at = now()
  WHERE id = p_booking_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_quantity', p_new_quantity,
    'new_total_amount', new_total_amount,
    'refund_amount', excess_payment,
    'message', 'Booking quantity reduced successfully'
  );
END;
$$;
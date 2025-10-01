-- Fix wallet balance update violations by using transactions instead of direct updates

-- 1. Fix process_booking_payment to NOT directly update wallet balance
CREATE OR REPLACE FUNCTION public.process_booking_payment(
  p_booking_id uuid,
  p_payment_amount numeric,
  p_user_id uuid,
  p_transaction_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record RECORD;
  share_record RECORD;
  user_wallet_id UUID;
  transaction_id UUID;
  fee_amount NUMERIC := 0;
  fee_settings RECORD;
  
  -- Progressive ownership calculations
  total_paid NUMERIC;
  calculated_payment_percentage NUMERIC;
  shares_per_payment NUMERIC;
  shares_unlocked NUMERIC;
  total_shares_owned NUMERIC;
  remaining_balance NUMERIC;
  booking_completed BOOLEAN := false;
  new_status TEXT;
  
  result JSONB;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record
  FROM public.share_bookings
  WHERE id = p_booking_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Booking not found or access denied'
    );
  END IF;
  
  -- Get share details
  SELECT * INTO share_record
  FROM public.shares
  WHERE id = booking_record.share_id;
  
  -- Get or create user wallet
  SELECT id INTO user_wallet_id
  FROM public.wallets
  WHERE user_id = p_user_id AND currency = booking_record.currency;
  
  IF user_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id, currency, balance, status)
    VALUES (p_user_id, booking_record.currency, 0, 'active')
    RETURNING id INTO user_wallet_id;
  END IF;
  
  -- Calculate expected transaction fee using current settings
  SELECT * INTO fee_settings 
  FROM get_transaction_fee_settings('booking_payment');
  
  IF fee_settings IS NOT NULL THEN
    fee_amount := GREATEST(
      (p_payment_amount * COALESCE(fee_settings.percentage_fee, 0)) / 100 + COALESCE(fee_settings.flat_fee, 0),
      COALESCE(fee_settings.minimum_fee, 0)
    );
    IF fee_settings.maximum_fee > 0 THEN
      fee_amount := LEAST(fee_amount, fee_settings.maximum_fee);
    END IF;
  END IF;
  
  -- Ensure sufficient balance including fee
  IF NOT EXISTS (
    SELECT 1 FROM public.wallets 
    WHERE id = user_wallet_id AND balance >= (p_payment_amount + fee_amount)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance. Required: ' || (p_payment_amount + fee_amount) || ' (including fee: ' || fee_amount || ')'
    );
  END IF;
  
  -- FIXED: Create transaction record - the trigger will handle wallet balance update
  INSERT INTO public.transactions (
    id,
    user_id,
    wallet_id,
    amount,
    transaction_type,
    status,
    currency,
    description,
    fee_amount,
    metadata
  ) VALUES (
    COALESCE(p_transaction_id, gen_random_uuid()),
    p_user_id,
    user_wallet_id,
    -(p_payment_amount + fee_amount), -- Negative for deduction
    'booking_payment',
    'completed',
    booking_record.currency,
    'Booking payment for ' || booking_record.quantity || ' shares',
    fee_amount,
    jsonb_build_object(
      'booking_id', p_booking_id,
      'share_id', booking_record.share_id,
      'payment_amount', p_payment_amount,
      'fee_amount', fee_amount
    )
  ) RETURNING id INTO transaction_id;
  
  -- Allocate and snapshot fee directly into transactions/admin fund
  PERFORM allocate_transaction_fee_with_snapshot(
    transaction_id,
    p_user_id,
    'booking_payment',
    p_payment_amount,
    booking_record.currency
  );
  
  -- Update booking cumulative payments
  UPDATE public.share_bookings
  SET cumulative_payments = COALESCE(cumulative_payments, 0) + p_payment_amount,
      updated_at = now()
  WHERE id = p_booking_id;
  
  -- Refresh booking record
  SELECT * INTO booking_record
  FROM public.share_bookings
  WHERE id = p_booking_id;
  
  -- Progressive ownership calculations
  total_paid := booking_record.cumulative_payments;
  calculated_payment_percentage := (total_paid / booking_record.total_amount) * 100;
  shares_per_payment := booking_record.quantity * (p_payment_amount / booking_record.total_amount);
  shares_unlocked := FLOOR(shares_per_payment);
  total_shares_owned := FLOOR(booking_record.quantity * (total_paid / booking_record.total_amount));
  
  -- Update progressive ownership fields
  UPDATE public.share_bookings
  SET 
    shares_owned_progressively = total_shares_owned,
    payment_percentage = calculated_payment_percentage,
    updated_at = now()
  WHERE id = p_booking_id;
  
  -- Determine completion
  remaining_balance := booking_record.total_amount - total_paid;
  IF remaining_balance <= 0.01 THEN
    booking_completed := true;
    new_status := 'completed';
    
    UPDATE public.share_bookings
    SET status = new_status, completed_at = now()
    WHERE id = p_booking_id;
  ELSIF total_paid > 0 THEN
    new_status := 'partially_paid';
    UPDATE public.share_bookings
    SET status = new_status
    WHERE id = p_booking_id;
  ELSE
    new_status := booking_record.status;
  END IF;
  
  result := jsonb_build_object(
    'success', true,
    'shares_unlocked', shares_unlocked,
    'total_shares_owned', total_shares_owned,
    'payment_percentage', calculated_payment_percentage,
    'remaining_balance', remaining_balance,
    'booking_completed', booking_completed,
    'new_status', new_status,
    'transaction_id', transaction_id
  );
  
  RETURN result;
END;
$$;

-- 2. Fix cancel_booking_order to use transactions instead of direct wallet updates
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
  
  -- FIXED: Refund to wallet via transaction if there were payments
  IF refund_amount > 0 AND wallet_id IS NOT NULL THEN
    -- Create refund transaction - trigger will update wallet balance
    INSERT INTO public.transactions (
      wallet_id, user_id, transaction_type, amount, currency, status, description
    ) VALUES (
      wallet_id, p_user_id, 'refund', refund_amount, 'UGX', 'completed',
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

-- 3. Fix reduce_booking_quantity to use transactions instead of direct wallet updates
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
  
  -- FIXED: Refund excess payment via transaction if any
  IF excess_payment > 0 AND wallet_id IS NOT NULL THEN
    -- Create refund transaction - trigger will update wallet balance
    INSERT INTO public.transactions (
      wallet_id, user_id, transaction_type, amount, currency, status, description
    ) VALUES (
      wallet_id, p_user_id, 'refund', excess_payment, 'UGX', 'completed',
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
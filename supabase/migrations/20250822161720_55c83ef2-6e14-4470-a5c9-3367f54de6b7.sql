-- Update process_booking_payment function to handle fresh wallet balance and better error messages
CREATE OR REPLACE FUNCTION public.process_booking_payment(
  p_booking_id UUID,
  p_payment_amount NUMERIC,
  p_user_id UUID,
  p_transaction_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_record RECORD;
  current_user_wallet RECORD;
  shares_to_unlock INTEGER := 0;
  new_payment_percentage NUMERIC;
  new_total_shares_owned INTEGER;
  remaining_balance NUMERIC;
  booking_completed BOOLEAN := FALSE;
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
  
  -- Get user's UGX wallet with fresh balance (important after currency exchange)
  SELECT * INTO current_user_wallet
  FROM public.wallets
  WHERE user_id = p_user_id AND currency = 'UGX' AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UGX wallet not found'
    );
  END IF;
  
  -- Check if user has sufficient balance with detailed error message
  IF current_user_wallet.balance < p_payment_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient wallet balance. Available: UGX ' || current_user_wallet.balance || ', Required: UGX ' || p_payment_amount
    );
  END IF;
  
  -- Calculate new payment percentage and shares
  new_payment_percentage := ((booking_record.cumulative_payments + p_payment_amount) / booking_record.total_amount) * 100;
  new_total_shares_owned := FLOOR((new_payment_percentage / 100) * booking_record.quantity);
  shares_to_unlock := GREATEST(0, new_total_shares_owned - COALESCE(booking_record.shares_owned_progressively, 0));
  remaining_balance := booking_record.total_amount - (booking_record.cumulative_payments + p_payment_amount);
  
  -- Check if booking is completed (100% paid)
  IF new_payment_percentage >= 100 THEN
    booking_completed := TRUE;
    new_payment_percentage := 100;
    remaining_balance := 0;
    new_total_shares_owned := booking_record.quantity;
  END IF;
  
  -- Update booking record
  UPDATE public.share_bookings
  SET 
    cumulative_payments = cumulative_payments + p_payment_amount,
    payment_percentage = new_payment_percentage,
    shares_owned_progressively = new_total_shares_owned,
    remaining_amount = remaining_balance,
    status = CASE WHEN booking_completed THEN 'completed' ELSE status END,
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  -- Deduct from user wallet
  UPDATE public.wallets
  SET 
    balance = balance - p_payment_amount,
    updated_at = NOW()
  WHERE id = current_user_wallet.id;
  
  -- Create transaction record
  INSERT INTO public.transactions (
    user_id,
    wallet_id,
    amount,
    transaction_type,
    currency,
    status,
    description,
    reference
  ) VALUES (
    p_user_id,
    current_user_wallet.id,
    -p_payment_amount,
    'booking_payment',
    'UGX',
    'completed',
    'Progressive ownership payment for booking #' || p_booking_id,
    'BOOKING-' || p_booking_id || '-' || extract(epoch from now())::text
  );
  
  -- Update user's share holdings if booking is completed
  IF booking_completed THEN
    INSERT INTO public.user_share_holdings (
      user_id,
      share_id,
      quantity,
      purchase_price_per_share,
      total_investment,
      purchase_date,
      source_booking_id
    ) VALUES (
      p_user_id,
      booking_record.share_id,
      booking_record.quantity,
      booking_record.price_per_share,
      booking_record.total_amount,
      NOW(),
      p_booking_id
    )
    ON CONFLICT (user_id, share_id) 
    DO UPDATE SET
      quantity = user_share_holdings.quantity + booking_record.quantity,
      total_investment = user_share_holdings.total_investment + booking_record.total_amount,
      updated_at = NOW();
  END IF;
  
  -- Build result
  result := jsonb_build_object(
    'success', true,
    'shares_unlocked', shares_to_unlock,
    'total_shares_owned', new_total_shares_owned,
    'payment_percentage', new_payment_percentage,
    'remaining_balance', remaining_balance,
    'booking_completed', booking_completed,
    'new_status', CASE WHEN booking_completed THEN 'completed' ELSE booking_record.status END
  );
  
  RETURN result;
END;
$$;
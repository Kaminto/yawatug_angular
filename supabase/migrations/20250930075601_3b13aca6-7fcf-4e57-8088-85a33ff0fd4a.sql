-- Fix both share purchase and booking payment errors

-- 1. Fix trigger for share purchase orders - handle missing metadata column gracefully
CREATE OR REPLACE FUNCTION trigger_record_purchase_order_movement()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  movement_type_val TEXT := 'purchase';
  admin_user_id UUID := NULL;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT full_name INTO user_name FROM profiles WHERE id = NEW.user_id;
    
    -- Only try to access metadata if the column exists in the table
    -- For now, default to 'purchase' since share_purchase_orders doesn't have metadata
    -- Admin issues should be handled separately through reserve_issue flow
    
    PERFORM record_share_movement(
      movement_type_val, 
      'share_pool', 
      'user_holdings',
      NEW.share_id, 
      NEW.quantity, 
      NEW.price_per_share, 
      NEW.total_amount, 
      NEW.currency,
      NEW.user_id, 
      admin_user_id, 
      'share_purchase_order', 
      NEW.id,
      movement_type_val || ' of ' || NEW.quantity || ' shares to ' || COALESCE(user_name, 'user'), 
      'completed'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix process_booking_payment to avoid ambiguous column reference
CREATE OR REPLACE FUNCTION public.process_booking_payment(
  p_booking_id uuid,
  p_payment_amount numeric,
  p_user_id uuid,
  p_transaction_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  booking_record RECORD;
  share_record RECORD;
  user_wallet_id UUID;
  transaction_id UUID;
  fee_amount NUMERIC := 0;
  fee_settings RECORD;
  
  -- Progressive ownership calculations
  total_paid NUMERIC;
  calculated_payment_percentage NUMERIC;  -- Renamed to avoid ambiguity
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
  
  -- Deduct payment amount + fee from user wallet
  UPDATE public.wallets
  SET balance = balance - (p_payment_amount + fee_amount),
      updated_at = now()
  WHERE id = user_wallet_id;
  
  -- Create transaction record for the payment (this will trigger allocation later)
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
    -p_payment_amount,
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
  
  -- Allocate and snapshot fee directly into transactions/admin fund (no transaction_fee_collections)
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
  
  -- Update progressive ownership fields (explicitly reference columns)
  UPDATE public.share_bookings
  SET 
    shares_owned_progressively = total_shares_owned,
    payment_percentage = calculated_payment_percentage,  -- Use the variable here
    updated_at = now()
  WHERE id = p_booking_id;
  
  -- Determine completion
  remaining_balance := booking_record.total_amount - total_paid;
  IF remaining_balance <= 0.01 THEN
    booking_completed := true;
    new_status := 'completed';
    
    UPDATE public.share_bookings
    SET status = 'completed', updated_at = now()
    WHERE id = p_booking_id;
    
    -- Grant shares
    INSERT INTO public.user_shares (
      user_id, share_id, quantity, purchase_price_per_share, currency, booking_id
    ) VALUES (
      p_user_id, booking_record.share_id, booking_record.quantity, booking_record.booked_price_per_share, booking_record.currency, p_booking_id
    );
  ELSE
    new_status := booking_record.status;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'shares_unlocked', shares_unlocked,
    'total_shares_owned', total_shares_owned,
    'payment_percentage', calculated_payment_percentage,
    'remaining_balance', remaining_balance,
    'booking_completed', booking_completed,
    'new_status', new_status,
    'transaction_id', transaction_id,
    'fee_amount', fee_amount
  );
END;
$function$;
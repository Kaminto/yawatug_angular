-- Fix admin wallet logic flow for booking payments
-- This migration ensures that booking payments properly trigger fee collection and fund allocation

-- First, let's update the auto_allocate_share_proceeds trigger function to handle booking payments
CREATE OR REPLACE FUNCTION public.auto_allocate_share_proceeds()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only allocate for completed share purchase and booking payment transactions
  IF NEW.status = 'completed' 
     AND NEW.transaction_type IN ('share_purchase', 'booking_payment')
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Call allocation function
    PERFORM allocate_share_purchase_proceeds_enhanced(
      ABS(NEW.amount),
      NEW.currency,
      NEW.id,
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create an enhanced process_booking_payment function that includes fee collection and transaction creation
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
  payment_percentage NUMERIC;
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
  
  -- Get user wallet
  SELECT id INTO user_wallet_id
  FROM public.wallets
  WHERE user_id = p_user_id AND currency = booking_record.currency;
  
  IF user_wallet_id IS NULL THEN
    -- Create wallet if it doesn't exist
    INSERT INTO public.wallets (user_id, currency, balance, status)
    VALUES (p_user_id, booking_record.currency, 0, 'active')
    RETURNING id INTO user_wallet_id;
  END IF;
  
  -- Calculate transaction fee
  SELECT * INTO fee_settings 
  FROM get_transaction_fee_settings('booking_payment');
  
  IF fee_settings IS NOT NULL THEN
    fee_amount := GREATEST(
      (p_payment_amount * COALESCE(fee_settings.fee_percentage, 0)) / 100 + COALESCE(fee_settings.flat_fee, 0),
      COALESCE(fee_settings.minimum_fee, 0)
    );
    
    IF fee_settings.maximum_fee > 0 THEN
      fee_amount := LEAST(fee_amount, fee_settings.maximum_fee);
    END IF;
  END IF;
  
  -- Check if user has sufficient balance (including fee)
  IF NOT EXISTS (
    SELECT 1 FROM public.wallets 
    WHERE id = user_wallet_id AND balance >= (p_payment_amount + fee_amount)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance. Required: ' || (p_payment_amount + fee_amount) || ' (including fee: ' || fee_amount || ')'
    );
  END IF;
  
  -- Deduct payment amount and fee from user wallet
  UPDATE public.wallets
  SET balance = balance - (p_payment_amount + fee_amount),
      updated_at = now()
  WHERE id = user_wallet_id;
  
  -- Create transaction record for the payment (this will trigger allocation)
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
    -p_payment_amount, -- Negative because it's going out of user wallet
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
  
  -- Collect transaction fee if applicable
  IF fee_amount > 0 THEN
    PERFORM allocate_transaction_fee_enhanced(
      transaction_id,
      p_user_id,
      'booking_payment',
      p_payment_amount,
      fee_amount,
      booking_record.currency
    );
  END IF;
  
  -- Update booking with cumulative payments
  UPDATE public.share_bookings
  SET cumulative_payments = COALESCE(cumulative_payments, 0) + p_payment_amount,
      updated_at = now()
  WHERE id = p_booking_id;
  
  -- Get updated booking record
  SELECT * INTO booking_record
  FROM public.share_bookings
  WHERE id = p_booking_id;
  
  -- Calculate progressive ownership
  total_paid := booking_record.cumulative_payments;
  payment_percentage := (total_paid / booking_record.total_amount) * 100;
  
  -- Calculate shares unlocked by this payment
  shares_per_payment := booking_record.quantity * (p_payment_amount / booking_record.total_amount);
  shares_unlocked := FLOOR(shares_per_payment);
  
  -- Calculate total shares owned progressively
  total_shares_owned := FLOOR(booking_record.quantity * (total_paid / booking_record.total_amount));
  
  -- Update progressive ownership
  UPDATE public.share_bookings
  SET shares_owned_progressively = total_shares_owned,
      payment_percentage = payment_percentage,
      updated_at = now()
  WHERE id = p_booking_id;
  
  -- Check if booking is fully paid
  remaining_balance := booking_record.total_amount - total_paid;
  
  IF remaining_balance <= 0.01 THEN -- Allow for small rounding differences
    booking_completed := true;
    new_status := 'completed';
    
    -- Update booking status
    UPDATE public.share_bookings
    SET status = 'completed',
        updated_at = now()
    WHERE id = p_booking_id;
    
    -- Add shares to user_shares table
    INSERT INTO public.user_shares (
      user_id,
      share_id,
      quantity,
      purchase_price_per_share,
      currency,
      booking_id
    ) VALUES (
      p_user_id,
      booking_record.share_id,
      booking_record.quantity,
      booking_record.booked_price_per_share,
      booking_record.currency,
      p_booking_id
    );
    
  ELSE
    new_status := booking_record.status;
  END IF;
  
  -- Record booking payment
  INSERT INTO public.share_booking_payments (
    booking_id,
    user_id,
    amount,
    currency,
    payment_method,
    transaction_id,
    status
  ) VALUES (
    p_booking_id,
    p_user_id,
    p_payment_amount,
    booking_record.currency,
    'wallet',
    transaction_id,
    'completed'
  );
  
  result := jsonb_build_object(
    'success', true,
    'shares_unlocked', shares_unlocked,
    'total_shares_owned', total_shares_owned,
    'payment_percentage', payment_percentage,
    'remaining_balance', remaining_balance,
    'booking_completed', booking_completed,
    'new_status', new_status,
    'transaction_id', transaction_id,
    'fee_amount', fee_amount
  );
  
  RETURN result;
END;
$function$;

-- Create calculate_progressive_ownership function if it doesn't exist
CREATE OR REPLACE FUNCTION public.calculate_progressive_ownership(
  p_booking_id uuid,
  p_payment_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  booking_record RECORD;
  current_paid NUMERIC;
  new_total_paid NUMERIC;
  payment_percentage NUMERIC;
  shares_unlocked NUMERIC;
  total_shares_owned NUMERIC;
  remaining_balance NUMERIC;
  result JSONB;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record
  FROM public.share_bookings
  WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Booking not found');
  END IF;
  
  current_paid := COALESCE(booking_record.cumulative_payments, 0);
  new_total_paid := current_paid + p_payment_amount;
  
  -- Calculate progressive ownership
  payment_percentage := (new_total_paid / booking_record.total_amount) * 100;
  total_shares_owned := FLOOR(booking_record.quantity * (new_total_paid / booking_record.total_amount));
  shares_unlocked := FLOOR(booking_record.quantity * (p_payment_amount / booking_record.total_amount));
  remaining_balance := booking_record.total_amount - new_total_paid;
  
  result := jsonb_build_object(
    'payment_percentage', payment_percentage,
    'shares_unlocked', shares_unlocked,
    'total_shares_owned', total_shares_owned,
    'remaining_balance', GREATEST(remaining_balance, 0),
    'booking_completed', remaining_balance <= 0.01
  );
  
  RETURN result;
END;
$function$;

-- Ensure the trigger is properly attached to the transactions table
DROP TRIGGER IF EXISTS auto_allocate_share_proceeds_trigger ON public.transactions;
CREATE TRIGGER auto_allocate_share_proceeds_trigger
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_allocate_share_proceeds();
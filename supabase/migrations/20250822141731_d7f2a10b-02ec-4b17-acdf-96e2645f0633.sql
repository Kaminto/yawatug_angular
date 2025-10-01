-- Add progressive ownership fields to share_bookings table
ALTER TABLE public.share_bookings 
ADD COLUMN IF NOT EXISTS shares_owned_progressively integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumulative_payments numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_percentage numeric DEFAULT 0;

-- Add booking reference to user_shares table
ALTER TABLE public.user_shares 
ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.share_bookings(id);

-- Update existing bookings to initialize progressive ownership fields
UPDATE public.share_bookings 
SET 
  shares_owned_progressively = CASE 
    WHEN status = 'completed' THEN quantity 
    ELSE 0 
  END,
  cumulative_payments = CASE 
    WHEN status = 'completed' THEN total_amount 
    ELSE down_payment_amount 
  END,
  payment_percentage = CASE 
    WHEN status = 'completed' THEN 100.0
    WHEN total_amount > 0 THEN (down_payment_amount / total_amount) * 100.0
    ELSE 0.0
  END;

-- Create function to calculate progressive ownership based on payments
CREATE OR REPLACE FUNCTION calculate_progressive_ownership(
  p_booking_id UUID,
  p_payment_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
  booking_record RECORD;
  new_cumulative_payments NUMERIC;
  new_payment_percentage NUMERIC;
  new_shares_owned INTEGER;
  shares_to_unlock INTEGER;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record 
  FROM public.share_bookings 
  WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Booking not found');
  END IF;
  
  -- Calculate new cumulative payments
  new_cumulative_payments := booking_record.cumulative_payments + p_payment_amount;
  
  -- Calculate payment percentage
  new_payment_percentage := CASE 
    WHEN booking_record.total_amount > 0 THEN 
      (new_cumulative_payments / booking_record.total_amount) * 100.0
    ELSE 0.0 
  END;
  
  -- Cap at 100%
  new_payment_percentage := LEAST(new_payment_percentage, 100.0);
  
  -- Calculate how many shares should be owned based on payment percentage
  new_shares_owned := FLOOR((new_payment_percentage / 100.0) * booking_record.quantity);
  
  -- Calculate shares to unlock with this payment
  shares_to_unlock := new_shares_owned - booking_record.shares_owned_progressively;
  
  RETURN jsonb_build_object(
    'new_cumulative_payments', new_cumulative_payments,
    'new_payment_percentage', new_payment_percentage,
    'new_shares_owned', new_shares_owned,
    'shares_to_unlock', shares_to_unlock,
    'remaining_balance', booking_record.total_amount - new_cumulative_payments,
    'is_completed', new_payment_percentage >= 100.0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process booking payment and update progressive ownership
CREATE OR REPLACE FUNCTION process_booking_payment(
  p_booking_id UUID,
  p_payment_amount NUMERIC,
  p_user_id UUID,
  p_transaction_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  booking_record RECORD;
  calculation_result JSONB;
  user_share_record RECORD;
  new_status TEXT;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record 
  FROM public.share_bookings 
  WHERE id = p_booking_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found or unauthorized');
  END IF;
  
  -- Calculate progressive ownership
  SELECT calculate_progressive_ownership(p_booking_id, p_payment_amount) INTO calculation_result;
  
  IF calculation_result ? 'error' THEN
    RETURN jsonb_build_object('success', false, 'error', calculation_result->>'error');
  END IF;
  
  -- Determine new booking status
  new_status := CASE 
    WHEN (calculation_result->>'is_completed')::boolean THEN 'completed'
    WHEN (calculation_result->>'new_payment_percentage')::numeric > 0 THEN 'partially_paid'
    ELSE booking_record.status
  END;
  
  -- Update booking with progressive ownership data
  UPDATE public.share_bookings 
  SET 
    cumulative_payments = (calculation_result->>'new_cumulative_payments')::numeric,
    payment_percentage = (calculation_result->>'new_payment_percentage')::numeric,
    shares_owned_progressively = (calculation_result->>'new_shares_owned')::integer,
    remaining_amount = (calculation_result->>'remaining_balance')::numeric,
    status = new_status,
    updated_at = now()
  WHERE id = p_booking_id;
  
  -- Create or update user_shares record for this booking
  SELECT * INTO user_share_record 
  FROM public.user_shares 
  WHERE user_id = p_user_id 
    AND share_id = booking_record.share_id 
    AND booking_id = p_booking_id;
  
  IF FOUND THEN
    -- Update existing user_shares record
    UPDATE public.user_shares 
    SET 
      quantity = (calculation_result->>'new_shares_owned')::integer,
      updated_at = now()
    WHERE id = user_share_record.id;
  ELSE
    -- Create new user_shares record if shares are being unlocked
    IF (calculation_result->>'shares_to_unlock')::integer > 0 THEN
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
        (calculation_result->>'new_shares_owned')::integer,
        booking_record.booked_price_per_share,
        booking_record.currency,
        p_booking_id
      );
    END IF;
  END IF;
  
  -- Record the payment
  INSERT INTO public.share_booking_payments (
    booking_id,
    payment_amount,
    payment_date,
    transaction_id
  ) VALUES (
    p_booking_id,
    p_payment_amount,
    now(),
    p_transaction_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'shares_unlocked', (calculation_result->>'shares_to_unlock')::integer,
    'total_shares_owned', (calculation_result->>'new_shares_owned')::integer,
    'payment_percentage', (calculation_result->>'new_payment_percentage')::numeric,
    'remaining_balance', (calculation_result->>'remaining_balance')::numeric,
    'booking_completed', (calculation_result->>'is_completed')::boolean,
    'new_status', new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for better performance on progressive ownership queries
CREATE INDEX IF NOT EXISTS idx_share_bookings_progressive 
ON public.share_bookings(user_id, share_id, status, shares_owned_progressively);

CREATE INDEX IF NOT EXISTS idx_user_shares_booking 
ON public.user_shares(booking_id) WHERE booking_id IS NOT NULL;
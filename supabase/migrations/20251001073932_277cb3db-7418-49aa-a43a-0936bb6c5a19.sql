-- Fix "record NEW has no field booking_id" by moving expected booking commission trigger to share_bookings
-- Remove WHEN clause with TG_OP from CREATE TRIGGER statement

-- 1) Drop the problematic trigger on share_purchase_orders if it exists
DROP TRIGGER IF EXISTS create_booking_commission_trigger ON public.share_purchase_orders;

-- 2) Create or replace a safe function that expects NEW from share_bookings
CREATE OR REPLACE FUNCTION public.create_expected_booking_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id UUID;
  expected_commission NUMERIC := 0;
  commission_rate NUMERIC := 0.05;
  remaining_amount NUMERIC := 0;
  booking_currency TEXT := 'UGX';
BEGIN
  -- Only process on INSERT or status change to active/pending/initiated
  IF TG_OP = 'UPDATE' AND (OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  -- Compute remaining amount defensively
  remaining_amount := COALESCE(
    NEW.remaining_amount,
    NEW.total_amount - COALESCE(NEW.down_payment_amount, 0),
    NEW.total_amount,
    0
  );

  booking_currency := COALESCE(NEW.currency, 'UGX');

  -- Find referrer for the booking owner
  SELECT referred_by INTO referrer_user_id
  FROM public.profiles
  WHERE id = NEW.user_id AND referred_by IS NOT NULL
  LIMIT 1;

  -- If no referrer, nothing to do
  IF referrer_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  expected_commission := COALESCE(remaining_amount, 0) * commission_rate;

  -- Insert expected referral commission tied to this booking
  INSERT INTO public.referral_commissions (
    referrer_id,
    referred_id,
    booking_id,
    commission_amount,
    commission_rate,
    source_amount,
    earning_type,
    commission_type,
    is_from_installment,
    status,
    currency
  ) VALUES (
    referrer_user_id,
    NEW.user_id,
    NEW.id,
    expected_commission,
    commission_rate,
    COALESCE(remaining_amount, 0),
    'expected_installment',
    'expected_booking',
    true,
    'pending',
    booking_currency
  );

  RETURN NEW;
END;
$$;

-- 3) Attach the trigger to share_bookings
DROP TRIGGER IF EXISTS create_booking_commission_trigger ON public.share_bookings;
CREATE TRIGGER create_booking_commission_trigger
  AFTER INSERT OR UPDATE ON public.share_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_expected_booking_commission();
-- Fix FK violations by moving expected-commission trigger to share_bookings and correcting booking payment handler

-- 1) Drop old trigger on share_purchase_orders (it causes FK errors)
DROP TRIGGER IF EXISTS create_booking_commission_trigger ON public.share_purchase_orders;
-- Also ensure no duplicate on share_bookings before recreating
DROP TRIGGER IF EXISTS create_booking_commission_trigger ON public.share_bookings;

-- 2) Update function to create expected commission on share_bookings inserts
CREATE OR REPLACE FUNCTION public.create_expected_booking_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id UUID;
  expected_commission NUMERIC;
  commission_rate NUMERIC := 0.05; -- 5%
BEGIN
  -- Get referrer for the booking user
  SELECT referred_by INTO referrer_user_id
  FROM public.profiles
  WHERE id = NEW.user_id AND referred_by IS NOT NULL;
  
  IF referrer_user_id IS NOT NULL THEN
    expected_commission := COALESCE(NEW.total_amount, 0) * commission_rate;
    
    -- Create expected commission record referencing share_bookings(id)
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
      NEW.id, -- booking_id references share_bookings(id)
      expected_commission,
      commission_rate,
      COALESCE(NEW.total_amount, 0),
      'purchase_commission',
      'expected_installment',
      true,
      'pending',
      COALESCE(NEW.currency, 'UGX')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3) Recreate trigger on the correct table
CREATE TRIGGER create_booking_commission_trigger
  AFTER INSERT ON public.share_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_expected_booking_commission();

-- 4) Fix process_booking_payment_commission to use share_booking_payments schema
CREATE OR REPLACE FUNCTION public.process_booking_payment_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id UUID;
  commission_rate NUMERIC := 0.05; -- 5%
  commission_amount NUMERIC;
  payment_amount NUMERIC;
  expected_commission_id UUID;
  remaining_expected NUMERIC;
  v_currency TEXT := 'UGX';
BEGIN
  -- Only process when payment completes
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status <> 'completed') THEN
    
    -- Find referrer for this paying user
    SELECT referred_by INTO referrer_id
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    IF referrer_id IS NOT NULL AND referrer_id <> NEW.user_id THEN
      payment_amount := COALESCE(NEW.payment_amount, 0);
      commission_amount := payment_amount * commission_rate;
      
      -- Get currency from booking
      SELECT currency INTO v_currency
      FROM public.share_bookings
      WHERE id = NEW.booking_id;
      v_currency := COALESCE(v_currency, 'UGX');
      
      -- Record paid commission for this installment
      INSERT INTO public.referral_commissions (
        referrer_id,
        referred_id,
        booking_id,
        booking_payment_id,
        commission_amount,
        commission_rate,
        source_amount,
        earning_type,
        commission_type,
        is_from_installment,
        status,
        currency,
        paid_at
      ) VALUES (
        referrer_id,
        NEW.user_id,
        NEW.booking_id,
        NEW.id,
        commission_amount,
        commission_rate,
        payment_amount,
        'share_purchase',
        'installment_payment',
        true,
        'paid',
        v_currency,
        now()
      );
      
      -- Reduce expected commission for this booking
      SELECT id, commission_amount INTO expected_commission_id, remaining_expected
      FROM public.referral_commissions
      WHERE booking_id = NEW.booking_id
        AND commission_type = 'expected_installment'
        AND status = 'pending'
        AND referrer_id = referrer_id
      ORDER BY created_at ASC
      LIMIT 1;
      
      IF expected_commission_id IS NOT NULL THEN
        remaining_expected := COALESCE(remaining_expected, 0) - commission_amount;
        IF remaining_expected <= 0.01 THEN
          UPDATE public.referral_commissions
          SET status = 'paid', commission_amount = 0, paid_at = now(), updated_at = now()
          WHERE id = expected_commission_id;
        ELSE
          UPDATE public.referral_commissions
          SET commission_amount = remaining_expected, updated_at = now()
          WHERE id = expected_commission_id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on share_booking_payments
DROP TRIGGER IF EXISTS process_booking_payment_commission_trigger ON public.share_booking_payments;
CREATE TRIGGER process_booking_payment_commission_trigger
  AFTER INSERT OR UPDATE ON public.share_booking_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.process_booking_payment_commission();
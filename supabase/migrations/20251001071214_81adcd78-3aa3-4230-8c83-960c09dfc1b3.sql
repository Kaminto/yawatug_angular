-- Fix the create_expected_booking_commission function to not reference payment_plan
-- The issue: share_purchase_orders table doesn't have a payment_plan column

DROP TRIGGER IF EXISTS create_booking_commission_trigger ON public.share_purchase_orders;

-- Update function to work without payment_plan check
-- Since share_purchase_orders are always for bookings/installments, we don't need the check
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
  -- Get referrer
  SELECT referred_by INTO referrer_user_id
  FROM public.profiles
  WHERE id = NEW.user_id AND referred_by IS NOT NULL;
  
  IF referrer_user_id IS NOT NULL THEN
    expected_commission := NEW.total_amount * commission_rate;
    
    -- Create expected commission record with booking_id
    INSERT INTO referral_commissions (
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
      NEW.id, -- This is the booking_id from share_purchase_orders
      expected_commission,
      commission_rate,
      NEW.total_amount,
      'purchase_commission',
      'expected_installment',
      true,
      'pending',
      COALESCE(NEW.currency, 'UGX')
    );
    
    -- Log to referral activities
    INSERT INTO referral_activities (
      referrer_id,
      referred_id,
      activity_type,
      metadata
    ) VALUES (
      referrer_user_id,
      NEW.user_id,
      'booking_created',
      jsonb_build_object(
        'booking_id', NEW.id,
        'expected_commission', expected_commission
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER create_booking_commission_trigger
  AFTER INSERT ON public.share_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_expected_booking_commission();
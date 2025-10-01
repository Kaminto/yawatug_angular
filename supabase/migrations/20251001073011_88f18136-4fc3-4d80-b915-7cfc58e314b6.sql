-- COMPREHENSIVE FIX: Remove all payment_plan references and establish correct commission flow

-- ========================================
-- STEP 1: Drop all existing buggy triggers
-- ========================================
DROP TRIGGER IF EXISTS direct_purchase_commission_trigger ON public.transactions;
DROP TRIGGER IF EXISTS create_booking_commission_trigger ON public.share_purchase_orders;
DROP TRIGGER IF EXISTS booking_payment_commission_trigger ON public.share_booking_payments;

-- ========================================
-- STEP 2: Clean function for direct purchase commissions
-- ========================================
CREATE OR REPLACE FUNCTION public.process_direct_purchase_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id UUID;
  commission_amt NUMERIC;
  commission_rate NUMERIC := 0.05;
  is_booking_payment BOOLEAN;
BEGIN
  -- Only process newly completed share purchase transactions
  IF NEW.status = 'completed' 
     AND NEW.transaction_type = 'share_purchase'
     AND (OLD IS NULL OR OLD.status <> 'completed') THEN
    
    RAISE NOTICE 'Processing commission for transaction %', NEW.id;
    
    -- Check if this transaction is linked to a booking payment
    SELECT EXISTS (
      SELECT 1 FROM public.share_booking_payments sbp
      WHERE sbp.transaction_id = NEW.id::text
    ) INTO is_booking_payment;
    
    RAISE NOTICE 'Is booking payment: %', is_booking_payment;
    
    -- Only process direct purchases (not booking payments)
    IF NOT is_booking_payment THEN
      -- Get referrer
      SELECT referred_by INTO referrer_user_id
      FROM public.profiles
      WHERE id = NEW.user_id AND referred_by IS NOT NULL;
      
      RAISE NOTICE 'Referrer ID: %', referrer_user_id;
      
      IF referrer_user_id IS NOT NULL THEN
        commission_amt := COALESCE(NEW.amount, 0) * commission_rate;
        
        -- Insert commission record
        INSERT INTO public.referral_commissions (
          referrer_id,
          referred_id,
          transaction_id,
          commission_amount,
          commission_rate,
          source_amount,
          earning_type,
          commission_type,
          is_from_installment,
          status,
          paid_at,
          currency
        ) VALUES (
          referrer_user_id,
          NEW.user_id,
          NEW.id,
          commission_amt,
          commission_rate,
          COALESCE(NEW.amount, 0),
          'purchase_commission',
          'direct_purchase',
          false,
          'paid',
          NOW(),
          COALESCE(NEW.currency, 'UGX')
        );
        
        RAISE NOTICE 'Commission recorded: % for transaction %', commission_amt, NEW.id;
        
        -- Log to referral activities
        INSERT INTO public.referral_activities (
          referrer_id,
          referred_id,
          activity_type,
          metadata
        ) VALUES (
          referrer_user_id,
          NEW.user_id,
          'commission_earned',
          jsonb_build_object(
            'transaction_id', NEW.id,
            'commission_amount', commission_amt,
            'commission_type', 'direct_purchase'
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ========================================
-- STEP 3: Function for expected booking commissions
-- ========================================
CREATE OR REPLACE FUNCTION public.create_expected_booking_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id UUID;
  expected_commission NUMERIC;
  commission_rate NUMERIC := 0.05;
  booking_record RECORD;
BEGIN
  RAISE NOTICE 'Creating expected commission for booking order %', NEW.id;
  
  -- Get booking details
  SELECT * INTO booking_record
  FROM public.share_bookings
  WHERE id = NEW.booking_id;
  
  IF booking_record IS NOT NULL THEN
    -- Get referrer
    SELECT referred_by INTO referrer_user_id
    FROM public.profiles
    WHERE id = booking_record.user_id AND referred_by IS NOT NULL;
    
    RAISE NOTICE 'Booking user: %, Referrer: %', booking_record.user_id, referrer_user_id;
    
    IF referrer_user_id IS NOT NULL THEN
      expected_commission := booking_record.total_amount * commission_rate;
      
      -- Insert expected commission record
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
        booking_record.user_id,
        booking_record.id,
        expected_commission,
        commission_rate,
        booking_record.total_amount,
        'expected_installment',
        'expected_booking',
        true,
        'pending',
        COALESCE(booking_record.currency, 'UGX')
      );
      
      RAISE NOTICE 'Expected commission created: % for booking %', expected_commission, booking_record.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ========================================
-- STEP 4: Function for booking payment commissions
-- ========================================
CREATE OR REPLACE FUNCTION public.process_booking_payment_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id UUID;
  commission_amt NUMERIC;
  commission_rate NUMERIC := 0.05;
  booking_record RECORD;
BEGIN
  -- Only process newly completed payments
  IF NEW.status = 'completed' 
     AND (OLD IS NULL OR OLD.status <> 'completed') THEN
    
    RAISE NOTICE 'Processing booking payment commission for payment %', NEW.id;
    
    -- Get booking details
    SELECT * INTO booking_record
    FROM public.share_bookings
    WHERE id = NEW.booking_id;
    
    IF booking_record IS NOT NULL THEN
      -- Get referrer
      SELECT referred_by INTO referrer_user_id
      FROM public.profiles
      WHERE id = booking_record.user_id AND referred_by IS NOT NULL;
      
      RAISE NOTICE 'Booking user: %, Referrer: %', booking_record.user_id, referrer_user_id;
      
      IF referrer_user_id IS NOT NULL THEN
        commission_amt := COALESCE(NEW.amount, 0) * commission_rate;
        
        -- Insert commission record for this payment
        INSERT INTO public.referral_commissions (
          referrer_id,
          referred_id,
          booking_id,
          installment_payment_id,
          transaction_id,
          commission_amount,
          commission_rate,
          source_amount,
          earning_type,
          commission_type,
          is_from_installment,
          status,
          paid_at,
          currency
        ) VALUES (
          referrer_user_id,
          booking_record.user_id,
          booking_record.id,
          NEW.id,
          NEW.transaction_id::uuid,
          commission_amt,
          commission_rate,
          COALESCE(NEW.amount, 0),
          'installment_payment',
          'booking_payment',
          true,
          'paid',
          NOW(),
          COALESCE(NEW.currency, 'UGX')
        );
        
        RAISE NOTICE 'Booking payment commission recorded: % for payment %', commission_amt, NEW.id;
        
        -- Log to referral activities
        INSERT INTO public.referral_activities (
          referrer_id,
          referred_id,
          activity_type,
          metadata
        ) VALUES (
          referrer_user_id,
          booking_record.user_id,
          'commission_earned',
          jsonb_build_object(
            'payment_id', NEW.id,
            'booking_id', booking_record.id,
            'commission_amount', commission_amt,
            'commission_type', 'booking_payment'
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ========================================
-- STEP 5: Recreate triggers with correct logic
-- ========================================

-- Trigger for direct purchase commissions
CREATE TRIGGER direct_purchase_commission_trigger
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_direct_purchase_commission();

-- Trigger for expected booking commissions (when booking order is created)
CREATE TRIGGER create_booking_commission_trigger
  AFTER INSERT ON public.share_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_expected_booking_commission();

-- Trigger for booking payment commissions (when installment is paid)
CREATE TRIGGER booking_payment_commission_trigger
  AFTER INSERT OR UPDATE ON public.share_booking_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.process_booking_payment_commission();
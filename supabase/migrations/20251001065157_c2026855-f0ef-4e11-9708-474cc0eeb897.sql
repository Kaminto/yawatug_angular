-- Enhanced Referral Commission System for Full Payments and Bookings
-- Fixed to use correct table names

-- Add new columns to referral_commissions table
ALTER TABLE public.referral_commissions
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.share_purchase_orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS booking_payment_id UUID REFERENCES public.share_booking_payments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS commission_type TEXT NOT NULL DEFAULT 'direct_purchase' 
  CHECK (commission_type IN ('direct_purchase', 'installment_payment', 'expected_installment')),
ADD COLUMN IF NOT EXISTS is_from_installment BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'UGX';

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_referral_commissions_booking ON public.referral_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_booking_payment ON public.referral_commissions(booking_payment_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_type ON public.referral_commissions(commission_type);

-- Function to calculate referral commission for direct purchases
CREATE OR REPLACE FUNCTION public.process_direct_purchase_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id UUID;
  commission_rate NUMERIC := 0.05; -- 5%
  commission_amount NUMERIC;
  purchase_amount NUMERIC;
BEGIN
  -- Only process completed share purchase transactions
  IF NEW.transaction_type = 'share_purchase' AND NEW.status = 'completed' 
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get the referrer of the user who made the purchase
    SELECT referred_by INTO referrer_id
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- If user was referred by someone
    IF referrer_id IS NOT NULL AND referrer_id != NEW.user_id THEN
      purchase_amount := ABS(NEW.amount);
      commission_amount := purchase_amount * commission_rate;
      
      -- Insert commission record for direct purchase
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
        currency,
        paid_at
      ) VALUES (
        referrer_id,
        NEW.user_id,
        NEW.id,
        commission_amount,
        commission_rate,
        purchase_amount,
        'share_purchase',
        'direct_purchase',
        false,
        'paid', -- Direct purchases pay commission immediately
        NEW.currency,
        now()
      );
      
      RAISE NOTICE 'Direct purchase commission created: Referrer %, Amount %', referrer_id, commission_amount;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to create expected commissions when a booking is created
CREATE OR REPLACE FUNCTION public.create_expected_booking_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id UUID;
  commission_rate NUMERIC := 0.05; -- 5%
  total_commission NUMERIC;
  booking_amount NUMERIC;
BEGIN
  -- Only process new bookings (not updates)
  IF TG_OP = 'INSERT' THEN
    
    -- Get the referrer of the user who made the booking
    SELECT referred_by INTO referrer_id
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- If user was referred by someone
    IF referrer_id IS NOT NULL AND referrer_id != NEW.user_id THEN
      booking_amount := NEW.total_amount;
      total_commission := booking_amount * commission_rate;
      
      -- Create expected commission record for the full booking amount
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
        referrer_id,
        NEW.user_id,
        NEW.id,
        total_commission,
        commission_rate,
        booking_amount,
        'share_purchase',
        'expected_installment',
        true,
        'pending',
        'UGX'
      );
      
      RAISE NOTICE 'Expected booking commission created: Referrer %, Booking %, Amount %', 
        referrer_id, NEW.id, total_commission;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to process booking payment commissions
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
  booking_user_id UUID;
  expected_commission_id UUID;
  remaining_expected NUMERIC;
BEGIN
  -- Only process completed booking payments
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    
    -- Get the user_id from the booking
    SELECT user_id INTO booking_user_id
    FROM public.share_purchase_orders
    WHERE id = NEW.order_id;
    
    -- Get the referrer of the user who made the payment
    SELECT referred_by INTO referrer_id
    FROM public.profiles
    WHERE id = booking_user_id;
    
    -- If user was referred by someone
    IF referrer_id IS NOT NULL AND referrer_id != booking_user_id THEN
      payment_amount := NEW.amount;
      commission_amount := payment_amount * commission_rate;
      
      -- Insert commission record for this booking payment
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
        booking_user_id,
        NEW.order_id,
        NEW.id,
        commission_amount,
        commission_rate,
        payment_amount,
        'share_purchase',
        'installment_payment',
        true,
        'paid', -- Booking payment commissions are paid immediately
        'UGX',
        now()
      );
      
      -- Update the expected commission
      -- Check if there's an expected commission for this booking
      SELECT id, commission_amount INTO expected_commission_id, remaining_expected
      FROM public.referral_commissions
      WHERE booking_id = NEW.order_id
        AND commission_type = 'expected_installment'
        AND status = 'pending'
        AND referrer_id = referrer_id
      LIMIT 1;
      
      IF expected_commission_id IS NOT NULL THEN
        -- Reduce the expected commission by the amount just paid
        remaining_expected := remaining_expected - commission_amount;
        
        IF remaining_expected <= 0.01 THEN
          -- All expected commission has been paid, mark as complete
          UPDATE public.referral_commissions
          SET status = 'paid',
              paid_at = now(),
              updated_at = now()
          WHERE id = expected_commission_id;
        ELSE
          -- Update the remaining expected amount
          UPDATE public.referral_commissions
          SET commission_amount = remaining_expected,
              updated_at = now()
          WHERE id = expected_commission_id;
        END IF;
      END IF;
      
      RAISE NOTICE 'Booking payment commission created: Referrer %, Payment %, Amount %', 
        referrer_id, NEW.id, commission_amount;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS calculate_referral_commission_trigger ON public.transactions;
DROP TRIGGER IF EXISTS process_direct_purchase_commission_trigger ON public.transactions;
DROP TRIGGER IF EXISTS create_booking_commission_trigger ON public.share_purchase_orders;
DROP TRIGGER IF EXISTS process_booking_payment_commission_trigger ON public.share_booking_payments;

-- Create triggers for all commission scenarios
-- 1. Direct purchase commissions (full payment)
CREATE TRIGGER process_direct_purchase_commission_trigger
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_direct_purchase_commission();

-- 2. Expected commissions when booking is created
CREATE TRIGGER create_booking_commission_trigger
  AFTER INSERT ON public.share_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_expected_booking_commission();

-- 3. Booking payment commissions
CREATE TRIGGER process_booking_payment_commission_trigger
  AFTER INSERT OR UPDATE ON public.share_booking_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.process_booking_payment_commission();

-- Update the referral statistics function to handle new commission types
CREATE OR REPLACE FUNCTION public.update_referral_statistics_enhanced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update referrer's statistics
  INSERT INTO public.referral_statistics (
    user_id,
    total_referrals,
    successful_referrals,
    total_earnings,
    pending_earnings,
    updated_at
  )
  SELECT 
    NEW.referrer_id,
    (SELECT COUNT(*) FROM public.profiles WHERE referred_by = NEW.referrer_id),
    (SELECT COUNT(DISTINCT referred_id) FROM public.referral_commissions 
     WHERE referrer_id = NEW.referrer_id AND status = 'paid'),
    COALESCE((SELECT SUM(commission_amount) FROM public.referral_commissions 
              WHERE referrer_id = NEW.referrer_id AND status = 'paid'), 0),
    COALESCE((SELECT SUM(commission_amount) FROM public.referral_commissions 
              WHERE referrer_id = NEW.referrer_id AND status = 'pending'), 0),
    now()
  ON CONFLICT (user_id) DO UPDATE SET
    total_referrals = EXCLUDED.total_referrals,
    successful_referrals = EXCLUDED.successful_referrals,
    total_earnings = EXCLUDED.total_earnings,
    pending_earnings = EXCLUDED.pending_earnings,
    updated_at = EXCLUDED.updated_at;
  
  RETURN NEW;
END;
$$;

-- Update trigger on referral_commissions
DROP TRIGGER IF EXISTS update_referral_statistics_trigger ON public.referral_commissions;
DROP TRIGGER IF EXISTS update_referral_statistics_enhanced_trigger ON public.referral_commissions;
CREATE TRIGGER update_referral_statistics_enhanced_trigger
  AFTER INSERT OR UPDATE ON public.referral_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_referral_statistics_enhanced();

-- Grant necessary permissions
GRANT SELECT ON public.referral_commissions TO authenticated;
GRANT INSERT ON public.referral_commissions TO service_role;
GRANT UPDATE ON public.referral_commissions TO service_role;
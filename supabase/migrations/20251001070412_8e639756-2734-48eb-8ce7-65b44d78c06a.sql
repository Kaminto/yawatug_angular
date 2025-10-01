-- Fix referral commission foreign key constraint issue
-- The problem: direct purchases don't have booking_ids, but the trigger was trying to set them

-- Drop the existing triggers
DROP TRIGGER IF EXISTS process_direct_purchase_commission_trigger ON public.transactions;
DROP TRIGGER IF EXISTS create_booking_commission_trigger ON public.share_purchase_orders;
DROP TRIGGER IF EXISTS process_booking_payment_commission_trigger ON public.share_booking_payments;

-- Fix the direct purchase commission function to NOT set booking_id
CREATE OR REPLACE FUNCTION public.process_direct_purchase_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id UUID;
  commission_amt NUMERIC;
  commission_rate NUMERIC := 0.05; -- 5%
BEGIN
  -- Only process completed share purchase transactions
  IF NEW.status = 'completed' 
     AND NEW.transaction_type = 'share_purchase'
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Check if this is a direct purchase (not a booking payment)
    -- Direct purchases don't have associated bookings
    IF NOT EXISTS (
      SELECT 1 FROM share_purchase_orders 
      WHERE user_id = NEW.user_id 
      AND share_id = NEW.share_id 
      AND payment_plan = 'installment'
      AND created_at BETWEEN (NEW.created_at - INTERVAL '5 minutes') AND (NEW.created_at + INTERVAL '5 minutes')
    ) THEN
      
      -- Get referrer
      SELECT referred_by INTO referrer_user_id
      FROM profiles
      WHERE id = NEW.user_id AND referred_by IS NOT NULL;
      
      IF referrer_user_id IS NOT NULL THEN
        commission_amt := NEW.amount * commission_rate;
        
        -- Insert commission record for direct purchase (no booking_id)
        INSERT INTO referral_commissions (
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
          NEW.amount,
          'purchase_commission',
          'direct_purchase',
          false,
          'paid',
          NOW(),
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

-- Fix the booking commission function to properly set booking_id
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
  -- Only for installment bookings
  IF NEW.payment_plan = 'installment' THEN
    
    -- Get referrer
    SELECT referred_by INTO referrer_user_id
    FROM profiles
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER process_direct_purchase_commission_trigger
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_direct_purchase_commission();

CREATE TRIGGER create_booking_commission_trigger
  AFTER INSERT ON public.share_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_expected_booking_commission();

CREATE TRIGGER process_booking_payment_commission_trigger
  AFTER INSERT OR UPDATE ON public.share_booking_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.process_booking_payment_commission();
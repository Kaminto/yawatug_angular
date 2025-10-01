-- Fix process_direct_purchase_commission to avoid referencing non-existent payment_plan
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
  is_booking_payment BOOLEAN := FALSE;
BEGIN
  -- Only process completed share purchase transactions once when they transition to completed
  IF NEW.status = 'completed' 
     AND NEW.transaction_type = 'share_purchase'
     AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN

    -- Determine if this transaction belongs to an installment booking payment
    SELECT EXISTS (
      SELECT 1 FROM public.share_booking_payments sbp
      WHERE sbp.transaction_id = NEW.id::text
    ) INTO is_booking_payment;

    -- Only handle direct purchases here (skip if tied to a booking payment)
    IF NOT is_booking_payment THEN
      -- Get referrer
      SELECT referred_by INTO referrer_user_id
      FROM public.profiles
      WHERE id = NEW.user_id AND referred_by IS NOT NULL;
      
      IF referrer_user_id IS NOT NULL THEN
        commission_amt := COALESCE(NEW.amount, 0) * commission_rate;
        
        -- Insert commission record for direct purchase (no booking_id)
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
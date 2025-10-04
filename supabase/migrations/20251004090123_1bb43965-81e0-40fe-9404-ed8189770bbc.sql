-- Step 1: Fix the broken record_referral_commission_as_transaction function
-- Issue: It references NEW.referred_user_id which doesn't exist (should be NEW.referred_id)

CREATE OR REPLACE FUNCTION public.record_referral_commission_as_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referrer_wallet_id UUID;
BEGIN
  -- Only process when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid') THEN
    
    -- Get referrer's wallet
    SELECT id INTO referrer_wallet_id
    FROM wallets
    WHERE user_id = NEW.referrer_id AND currency = COALESCE(NEW.currency, 'UGX')
    LIMIT 1;
    
    -- If wallet exists, create transaction record
    IF referrer_wallet_id IS NOT NULL THEN
      INSERT INTO transactions (
        user_id,
        wallet_id,
        amount,
        currency,
        transaction_type,
        status,
        reference,
        description,
        correlation_id
      ) VALUES (
        NEW.referrer_id,
        referrer_wallet_id,
        NEW.commission_amount, -- Positive amount for income
        COALESCE(NEW.currency, 'UGX'),
        'referral_commission',
        'completed',
        'REF_' || NEW.referred_id::text, -- FIXED: was NEW.referred_user_id
        'Referral commission earned',
        NEW.id::text
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 2: Drop the existing booking commission trigger
DROP TRIGGER IF EXISTS create_expected_commission_on_booking ON share_bookings;

-- Step 3: Update the function to create commissions for BOTH down payment and remaining balance
CREATE OR REPLACE FUNCTION public.create_expected_booking_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referrer_user_id UUID;
  commission_rate NUMERIC := 0.05;
  down_payment_amt NUMERIC := 0;
  remaining_amt NUMERIC := 0;
  down_payment_commission NUMERIC := 0;
  remaining_commission NUMERIC := 0;
  booking_currency TEXT := 'UGX';
BEGIN
  -- Only process on INSERT or status change
  IF TG_OP = 'UPDATE' AND (OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  -- Get amounts
  down_payment_amt := COALESCE(NEW.down_payment_amount, 0);
  remaining_amt := COALESCE(
    NEW.remaining_amount,
    NEW.total_amount - down_payment_amt,
    0
  );
  
  booking_currency := COALESCE(NEW.currency, 'UGX');

  -- Find referrer
  SELECT referred_by INTO referrer_user_id
  FROM public.profiles
  WHERE id = NEW.user_id AND referred_by IS NOT NULL
  LIMIT 1;

  -- If no referrer, exit
  IF referrer_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate commissions
  down_payment_commission := down_payment_amt * commission_rate;
  remaining_commission := remaining_amt * commission_rate;

  -- Create PAID commission for down payment
  IF down_payment_amt > 0 AND down_payment_commission > 0 THEN
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
      paid_at,
      currency
    ) VALUES (
      referrer_user_id,
      NEW.user_id,
      NEW.id,
      down_payment_commission,
      commission_rate,
      down_payment_amt,
      'direct_purchase',
      'direct_purchase',
      false,
      'paid',
      NOW(),
      booking_currency
    );
  END IF;

  -- Create PENDING commission for remaining balance
  IF remaining_amt > 0 AND remaining_commission > 0 THEN
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
      remaining_commission,
      commission_rate,
      remaining_amt,
      'expected_installment',
      'expected_booking',
      true,
      'pending',
      booking_currency
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Step 4: Recreate the trigger
CREATE TRIGGER create_expected_commission_on_booking
AFTER INSERT OR UPDATE ON share_bookings
FOR EACH ROW
EXECUTE FUNCTION create_expected_booking_commission();

-- Step 5: Clean up duplicate pending commissions
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY booking_id, referrer_id, status
      ORDER BY created_at DESC
    ) as rn
  FROM referral_commissions
  WHERE booking_id IS NOT NULL
  AND status = 'pending'
  AND commission_type IN ('expected_booking', 'expected_installment')
)
DELETE FROM referral_commissions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 6: Create paid commissions for existing bookings (one-time fix)
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
  paid_at,
  currency,
  created_at
)
SELECT 
  p.referred_by as referrer_id,
  sb.user_id as referred_id,
  sb.id as booking_id,
  COALESCE(sb.down_payment_amount, 0) * 0.05 as commission_amount,
  0.05 as commission_rate,
  COALESCE(sb.down_payment_amount, 0) as source_amount,
  'direct_purchase' as earning_type,
  'direct_purchase' as commission_type,
  false as is_from_installment,
  'paid' as status,
  sb.created_at as paid_at,
  COALESCE(sb.currency, 'UGX') as currency,
  sb.created_at as created_at
FROM share_bookings sb
INNER JOIN profiles p ON sb.user_id = p.id
WHERE p.referred_by IS NOT NULL
  AND COALESCE(sb.down_payment_amount, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM referral_commissions rc
    WHERE rc.booking_id = sb.id
    AND rc.status = 'paid'
    AND rc.commission_type = 'direct_purchase'
  );
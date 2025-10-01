-- Create the missing referral commission calculation functions

-- Function to calculate referral commission for completed transactions (direct purchases and installment payments)
CREATE OR REPLACE FUNCTION public.calculate_enhanced_referral_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    referrer_id UUID;
    commission_amount NUMERIC;
    commission_rate NUMERIC := 0.05; -- 5% commission
BEGIN
    -- Get referrer for this user
    SELECT p.referred_by INTO referrer_id
    FROM profiles p
    WHERE p.id = NEW.user_id;
    
    IF referrer_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Calculate commission (5% of transaction amount)
    commission_amount := NEW.amount * commission_rate;
    
    -- Insert referral commission based on transaction type
    IF TG_TABLE_NAME = 'transactions' AND NEW.transaction_type = 'share_purchase' THEN
        INSERT INTO referral_commissions (
            referrer_id,
            referred_id,
            commission_amount,
            commission_rate,
            source_amount,
            earning_type,
            commission_type,
            is_from_installment,
            status,
            transaction_id
        ) VALUES (
            referrer_id,
            NEW.user_id,
            commission_amount,
            commission_rate,
            NEW.amount,
            'direct_purchase',
            'direct_purchase',
            false,
            'paid',
            NEW.id
        );
    ELSIF TG_TABLE_NAME = 'share_booking_payments' THEN
        INSERT INTO referral_commissions (
            referrer_id,
            referred_id,
            commission_amount,
            commission_rate,
            source_amount,
            earning_type,
            commission_type,
            is_from_installment,
            status,
            installment_payment_id
        ) VALUES (
            referrer_id,
            NEW.user_id,
            commission_amount,
            commission_rate,
            NEW.amount,
            'installment_payment',
            'installment_payment',
            true,
            'paid',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to calculate expected referral commission for bookings
CREATE OR REPLACE FUNCTION public.calculate_expected_referral_earnings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    referrer_id UUID;
    commission_amount NUMERIC;
    commission_rate NUMERIC := 0.05; -- 5% commission
BEGIN
    -- Get referrer for this user
    SELECT p.referred_by INTO referrer_id
    FROM profiles p
    WHERE p.id = NEW.user_id;
    
    IF referrer_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Calculate expected commission (5% of total booking amount)
    commission_amount := NEW.total_amount * commission_rate;
    
    -- Insert expected referral commission
    INSERT INTO referral_commissions (
        referrer_id,
        referred_id,
        commission_amount,
        commission_rate,
        source_amount,
        earning_type,
        commission_type,
        is_from_installment,
        status,
        booking_id
    ) VALUES (
        referrer_id,
        NEW.user_id,
        commission_amount,
        commission_rate,
        NEW.total_amount,
        'expected_booking',
        'expected_installment',
        false,
        'pending',
        NEW.id
    );
    
    RETURN NEW;
END;
$$;

-- Manually create the missing commission for nandudu's booking (retroactive)
DO $$
DECLARE
    nandudu_id UUID := 'ad067047-71cd-4662-91ff-10dc67cc5d5f';
    referrer_id UUID := '3378baf3-0b9c-4549-b5d6-7096f131f4c5';
    booking_id UUID := '89f07f2c-c254-48bb-a7d6-baa6ef649086';
    commission_amount NUMERIC := 2000000 * 0.05; -- 5% of 2M UGX = 100,000 UGX
BEGIN
    -- Create the expected commission for nandudu's existing booking
    INSERT INTO referral_commissions (
        referrer_id,
        referred_id,
        commission_amount,
        commission_rate,
        source_amount,
        earning_type,
        commission_type,
        is_from_installment,
        status,
        booking_id
    ) VALUES (
        referrer_id,
        nandudu_id,
        commission_amount,
        0.05,
        2000000,
        'expected_booking',  
        'expected_installment',
        false,
        'pending',
        booking_id
    );
END $$;
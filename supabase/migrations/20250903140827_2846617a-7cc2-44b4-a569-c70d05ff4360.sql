-- Enhanced Referral Commission System with Earned vs Expected tracking

-- Add new fields to referral_commissions table for enhanced tracking
ALTER TABLE public.referral_commissions 
ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.share_bookings(id),
ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'direct_purchase',
ADD COLUMN IF NOT EXISTS is_from_installment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS installment_payment_id uuid REFERENCES public.share_booking_payments(id);

-- Create enhanced referral commission calculation function
CREATE OR REPLACE FUNCTION public.calculate_enhanced_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
    referrer_profile RECORD;
    commission_amount NUMERIC := 0;
    commission_rate NUMERIC := 0.05; -- 5% default rate
    source_amount NUMERIC := 0;
    commission_type TEXT;
    booking_record RECORD;
BEGIN
    -- Handle different trigger sources
    IF TG_TABLE_NAME = 'transactions' AND NEW.transaction_type = 'share_purchase' THEN
        -- Direct share purchase
        SELECT * INTO referrer_profile 
        FROM public.profiles 
        WHERE id = (
            SELECT referred_by 
            FROM public.profiles 
            WHERE id = NEW.user_id
        );
        
        source_amount := NEW.amount;
        commission_type := 'direct_purchase';
        
    ELSIF TG_TABLE_NAME = 'share_booking_payments' THEN
        -- Installment payment on booking
        SELECT sb.*, p.referred_by INTO booking_record
        FROM public.share_bookings sb
        JOIN public.profiles p ON p.id = sb.user_id
        WHERE sb.id = NEW.booking_id;
        
        SELECT * INTO referrer_profile 
        FROM public.profiles 
        WHERE id = booking_record.referred_by;
        
        source_amount := NEW.payment_amount;
        commission_type := 'installment_payment';
        
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Only proceed if user was referred by someone
    IF referrer_profile.id IS NOT NULL THEN
        commission_amount := source_amount * commission_rate;
        
        -- Insert commission record
        INSERT INTO public.referral_commissions (
            referrer_id,
            referred_id,
            transaction_id,
            booking_id,
            installment_payment_id,
            commission_amount,
            commission_rate,
            source_amount,
            earning_type,
            commission_type,
            is_from_installment,
            status
        ) VALUES (
            referrer_profile.id,
            CASE 
                WHEN TG_TABLE_NAME = 'transactions' THEN NEW.user_id
                WHEN TG_TABLE_NAME = 'share_booking_payments' THEN booking_record.user_id
            END,
            CASE WHEN TG_TABLE_NAME = 'transactions' THEN NEW.id ELSE NULL END,
            CASE WHEN TG_TABLE_NAME = 'share_booking_payments' THEN NEW.booking_id ELSE NULL END,
            CASE WHEN TG_TABLE_NAME = 'share_booking_payments' THEN NEW.id ELSE NULL END,
            commission_amount,
            commission_rate,
            source_amount,
            commission_type,
            commission_type,
            TG_TABLE_NAME = 'share_booking_payments',
            'paid' -- Mark as paid since payment was completed
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for installment payments
DROP TRIGGER IF EXISTS calculate_installment_referral_commission ON public.share_booking_payments;
CREATE TRIGGER calculate_installment_referral_commission
    AFTER INSERT ON public.share_booking_payments
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION public.calculate_enhanced_referral_commission();

-- Update existing trigger for direct purchases
DROP TRIGGER IF EXISTS calculate_referral_commission ON public.transactions;
CREATE TRIGGER calculate_referral_commission
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    WHEN (NEW.transaction_type = 'share_purchase' AND NEW.status = 'completed')
    EXECUTE FUNCTION public.calculate_enhanced_referral_commission();

-- Create function to calculate expected earnings from bookings
CREATE OR REPLACE FUNCTION public.calculate_expected_referral_earnings()
RETURNS TRIGGER AS $$
DECLARE
    referrer_profile RECORD;
    expected_commission NUMERIC := 0;
    commission_rate NUMERIC := 0.05;
    remaining_amount NUMERIC := 0;
BEGIN
    -- Only process new bookings or status changes to 'active'
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active')) THEN
        
        -- Get referrer information
        SELECT * INTO referrer_profile 
        FROM public.profiles 
        WHERE id = (
            SELECT referred_by 
            FROM public.profiles 
            WHERE id = NEW.user_id
        );
        
        IF referrer_profile.id IS NOT NULL THEN
            -- Calculate expected commission on remaining amount
            remaining_amount := COALESCE(NEW.remaining_amount, NEW.total_amount - NEW.down_payment_amount);
            expected_commission := remaining_amount * commission_rate;
            
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
                status
            ) VALUES (
                referrer_profile.id,
                NEW.user_id,
                NEW.id,
                expected_commission,
                commission_rate,
                remaining_amount,
                'expected_booking',
                'expected_installment',
                true,
                'pending'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for expected earnings from bookings
DROP TRIGGER IF EXISTS calculate_expected_referral_earnings ON public.share_bookings;
CREATE TRIGGER calculate_expected_referral_earnings
    AFTER INSERT OR UPDATE ON public.share_bookings
    FOR each ROW
    EXECUTE FUNCTION public.calculate_expected_referral_earnings();
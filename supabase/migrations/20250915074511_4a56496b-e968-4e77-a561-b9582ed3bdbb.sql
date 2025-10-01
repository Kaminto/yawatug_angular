-- Fix 6 critical issues
-- 1. Ensure referral trigger handles club imports properly
-- 2. Fix booking user_id trigger issue 
-- 3. Fix activation token validation
-- 4. Improve referral tracking

-- 1. Update share_booking_payments to include user_id (may be missing)
ALTER TABLE public.share_booking_payments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id);

-- 2. Update the trigger on share_booking_payments to work with existing schema
-- The issue is likely that triggers expect user_id but it's not always there
-- Let's create a function to get user_id from booking
CREATE OR REPLACE FUNCTION public.get_user_id_from_booking(p_booking_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_user_id UUID;
BEGIN
  SELECT user_id INTO booking_user_id 
  FROM public.share_bookings 
  WHERE id = p_booking_id;
  
  RETURN booking_user_id;
END;
$$;

-- 3. Fix allocate_transaction_fee_enhanced trigger function to handle missing user_id
CREATE OR REPLACE FUNCTION public.allocate_transaction_fee_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  derived_user_id UUID;
BEGIN
    -- Check if fee collection is enabled
    IF (SELECT setting_value::boolean FROM wallet_global_settings WHERE setting_key = 'fee_collection_enabled') THEN
        -- Get user_id - either from record or derive it
        derived_user_id := COALESCE(NEW.user_id, get_user_id_from_booking(NEW.booking_id));
        
        -- Only proceed if we have a user_id
        IF derived_user_id IS NOT NULL THEN
            -- Insert record into transaction_fee_collections
            INSERT INTO transaction_fee_collections (
                transaction_id,
                user_id,
                transaction_type,
                base_amount,
                fee_percentage,
                flat_fee,
                calculated_fee,
                actual_fee_collected,
                currency,
                allocation_status
            ) VALUES (
                NEW.id,
                derived_user_id,
                COALESCE(NEW.transaction_type, 'booking_payment'),
                NEW.amount,
                COALESCE(NEW.fee_percentage, 0),
                COALESCE(NEW.flat_fee, 0),
                COALESCE(NEW.fee_amount, 0),
                COALESCE(NEW.fee_amount, 0),
                NEW.currency,
                'pending'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 4. Ensure trigger exists on share_booking_payments 
DROP TRIGGER IF EXISTS allocate_fee_on_booking_payment ON public.share_booking_payments;
CREATE TRIGGER allocate_fee_on_booking_payment
    BEFORE INSERT OR UPDATE ON public.share_booking_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.allocate_transaction_fee_enhanced();

-- 5. Update referral code trigger to be more robust for imports
CREATE OR REPLACE FUNCTION public.set_referral_code_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Always generate a new referral code if missing or invalid, regardless of source
  IF NEW.referral_code IS NULL
     OR NEW.referral_code = ''
     OR NEW.referral_code = 'YWT00000'
     OR NEW.referral_code !~ '^YWT[0-9]{5}$' THEN
    NEW.referral_code := public.generate_next_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Create function to properly link referrals during registration/import
CREATE OR REPLACE FUNCTION public.link_referral_on_registration(p_user_id UUID, p_referrer_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_id UUID;
BEGIN
  -- Find referrer by code
  SELECT id INTO referrer_id 
  FROM public.profiles 
  WHERE referral_code = p_referrer_code
  AND id != p_user_id; -- Don't allow self-referral
  
  IF referrer_id IS NOT NULL THEN
    -- Update the user's referred_by field
    UPDATE public.profiles 
    SET referred_by = referrer_id,
        updated_at = now()
    WHERE id = p_user_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 7. Fix validation function for invitation tokens
CREATE OR REPLACE FUNCTION public.validate_invitation_token_enhanced(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
  result JSONB;
BEGIN
  -- Find valid invitation token
  SELECT * INTO invitation_record
  FROM public.imported_user_invitations
  WHERE invitation_token = p_token
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Check if token exists but is expired or used
    SELECT * INTO invitation_record
    FROM public.imported_user_invitations
    WHERE invitation_token = p_token
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      IF invitation_record.status != 'pending' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Token has already been used',
          'user_id', invitation_record.user_id
        );
      ELSIF invitation_record.expires_at <= now() THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Token has expired',
          'user_id', invitation_record.user_id
        );
      END IF;
    END IF;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid token',
      'user_id', null
    );
  END IF;
  
  -- Token is valid
  RETURN jsonb_build_object(
    'success', true,
    'user_id', invitation_record.user_id,
    'email', (SELECT email FROM public.profiles WHERE id = invitation_record.user_id)
  );
END;
$$;
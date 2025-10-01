-- Fix duplicate referral codes and ensure uniqueness
-- First, let's create a function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
    counter INTEGER := 3;
BEGIN
    LOOP
        -- Generate code in format YWT + 5 digit number
        new_code := 'YWT' || LPAD(counter::TEXT, 5, '0');
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
        
        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
        
        -- Increment counter and try again
        counter := counter + 1;
    END LOOP;
END;
$$;

-- Update duplicate YWT00000 codes with unique codes
DO $$
DECLARE
    user_record RECORD;
    new_code TEXT;
BEGIN
    FOR user_record IN 
        SELECT id FROM profiles 
        WHERE referral_code = 'YWT00000' 
        ORDER BY created_at ASC
    LOOP
        -- Generate unique code for each user
        new_code := generate_unique_referral_code();
        
        -- Update the user's referral code
        UPDATE profiles 
        SET referral_code = new_code,
            updated_at = now()
        WHERE id = user_record.id;
    END LOOP;
END;
$$;

-- Add unique constraint to prevent future duplicates
ALTER TABLE profiles ADD CONSTRAINT unique_referral_code UNIQUE (referral_code);

-- Create a function to handle referral registration properly
CREATE OR REPLACE FUNCTION process_referral_signup(
    p_referred_user_id UUID,
    p_referral_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    referrer_id UUID;
    program_id UUID;
BEGIN
    -- Find the referrer by referral code
    SELECT id INTO referrer_id
    FROM profiles
    WHERE referral_code = p_referral_code
    LIMIT 1;
    
    IF referrer_id IS NULL THEN
        RETURN FALSE; -- Invalid referral code
    END IF;
    
    -- Update the referred user's profile
    UPDATE profiles
    SET referred_by = referrer_id,
        updated_at = now()
    WHERE id = p_referred_user_id;
    
    -- Get active referral program
    SELECT id INTO program_id
    FROM referral_programs 
    WHERE is_active = true
    LIMIT 1;
    
    -- Create referral activity record
    INSERT INTO referral_activities (
        referrer_id,
        referred_id,
        program_id,
        activity_type,
        status
    ) VALUES (
        referrer_id,
        p_referred_user_id,
        program_id,
        'signup',
        'processed'
    );
    
    RETURN TRUE;
END;
$$;
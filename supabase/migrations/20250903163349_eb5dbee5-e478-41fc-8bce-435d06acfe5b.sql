-- Remove tier-based commission rates and add enable/disable toggle
DELETE FROM public.referral_settings 
WHERE setting_name IN ('bronze_tier_rate', 'silver_tier_rate', 'gold_tier_rate', 'platinum_tier_rate');

-- Add enable/disable setting
INSERT INTO public.referral_settings (setting_name, setting_value, description) VALUES
  ('commission_enabled', 1, 'Enable/disable referral commission system (1 = enabled, 0 = disabled)')
ON CONFLICT (setting_name) DO NOTHING;

-- Update the auto_track_referral_commission function to check if commissions are enabled
CREATE OR REPLACE FUNCTION auto_track_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id UUID;
  commission_amount NUMERIC;
  commission_rate NUMERIC := 0.05; -- Default fallback
  commission_enabled BOOLEAN := false;
BEGIN
  -- Only process completed purchase transactions with actual amounts
  IF NEW.status = 'completed' AND NEW.transaction_type = 'purchase' AND NEW.total_amount > 0 THEN
    
    -- Check if commission system is enabled
    SELECT CASE WHEN setting_value > 0 THEN true ELSE false END INTO commission_enabled
    FROM referral_settings
    WHERE setting_name = 'commission_enabled' AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 1;
    
    -- If commissions are disabled, exit early
    IF NOT commission_enabled THEN
      RETURN NEW;
    END IF;
    
    -- Get the referrer for this user
    SELECT referred_by INTO referrer_id 
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- If user has a referrer, create commission records
    IF referrer_id IS NOT NULL THEN
      -- Get configurable commission rate
      SELECT setting_value INTO commission_rate
      FROM referral_settings
      WHERE setting_name = 'base_commission_rate' AND is_active = true
      ORDER BY updated_at DESC
      LIMIT 1;
      
      -- Use fallback if no setting found
      IF commission_rate IS NULL THEN
        commission_rate := 0.05;
      END IF;
      
      commission_amount := NEW.total_amount * commission_rate;
      
      -- Create referral earning record
      INSERT INTO referral_earnings (
        referrer_id,
        referred_id,
        transaction_id,
        earning_amount,
        earning_type,
        status
      ) VALUES (
        referrer_id,
        NEW.user_id,
        NEW.id,
        commission_amount,
        'share_purchase_commission',
        'pending'
      );
      
      -- Create referral activity record
      INSERT INTO referral_activities (
        referrer_id,
        referred_id,
        activity_type,
        transaction_id,
        investment_amount,
        commission_earned,
        bonus_earned,
        status
      ) VALUES (
        referrer_id,
        NEW.user_id,
        'purchase_commission',
        NEW.id,
        NEW.total_amount,
        commission_amount,
        0,
        'processed'
      );
      
      -- Update referrer statistics
      INSERT INTO referral_statistics (user_id, pending_earnings, total_earnings, updated_at, last_activity_at)
      VALUES (referrer_id, commission_amount, commission_amount, now(), now())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        pending_earnings = referral_statistics.pending_earnings + commission_amount,
        total_earnings = referral_statistics.total_earnings + commission_amount,
        updated_at = now(),
        last_activity_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
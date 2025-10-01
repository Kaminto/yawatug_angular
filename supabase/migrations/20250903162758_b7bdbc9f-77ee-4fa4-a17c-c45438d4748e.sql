-- Create referral settings table for configurable commission rates
CREATE TABLE IF NOT EXISTS public.referral_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_name text NOT NULL UNIQUE,
  setting_value numeric NOT NULL,
  currency text NOT NULL DEFAULT 'UGX',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on referral_settings
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for referral_settings
CREATE POLICY "Admins can manage referral settings" ON public.referral_settings
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active referral settings" ON public.referral_settings
  FOR SELECT USING (is_active = true);

-- Insert default commission rates
INSERT INTO public.referral_settings (setting_name, setting_value, description) VALUES
  ('base_commission_rate', 0.05, 'Base referral commission rate (5%)'),
  ('bronze_tier_rate', 0.04, 'Bronze tier commission rate (4%)'),
  ('silver_tier_rate', 0.05, 'Silver tier commission rate (5%)'),
  ('gold_tier_rate', 0.055, 'Gold tier commission rate (5.5%)'),
  ('platinum_tier_rate', 0.06, 'Platinum tier commission rate (6%)')
ON CONFLICT (setting_name) DO NOTHING;

-- Update the auto_track_referral_commission function to use configurable rate
CREATE OR REPLACE FUNCTION auto_track_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id UUID;
  commission_amount NUMERIC;
  commission_rate NUMERIC := 0.05; -- Default fallback
BEGIN
  -- Only process completed purchase transactions with actual amounts
  IF NEW.status = 'completed' AND NEW.transaction_type = 'purchase' AND NEW.total_amount > 0 THEN
    
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

-- Create trigger to update referral_settings timestamps
CREATE OR REPLACE FUNCTION update_referral_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_settings_timestamp
  BEFORE UPDATE ON public.referral_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_settings_timestamp();
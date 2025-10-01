-- Create referral commissions table for tracking earnings
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 0.05, -- 5% default
  source_amount NUMERIC NOT NULL DEFAULT 0,
  earning_type TEXT NOT NULL DEFAULT 'share_purchase',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own referral commissions" 
ON public.referral_commissions 
FOR SELECT 
USING (referrer_id = auth.uid());

CREATE POLICY "System can insert referral commissions" 
ON public.referral_commissions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage all referral commissions" 
ON public.referral_commissions 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create trigger to calculate referral commissions on share purchases
CREATE OR REPLACE FUNCTION public.calculate_referral_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_profile RECORD;
  commission_amount NUMERIC;
  commission_rate NUMERIC := 0.05; -- 5%
BEGIN
  -- Only process completed share purchase transactions
  IF NEW.transaction_type = 'share_purchase' AND NEW.status = 'completed' THEN
    -- Get the profile of the user who made the purchase
    SELECT * INTO referrer_profile
    FROM public.profiles
    WHERE id = (
      SELECT referred_by 
      FROM public.profiles 
      WHERE id = NEW.user_id
    );
    
    -- If user was referred by someone, create commission record
    IF referrer_profile.id IS NOT NULL THEN
      commission_amount := ABS(NEW.amount) * commission_rate;
      
      INSERT INTO public.referral_commissions (
        referrer_id,
        referred_id,
        transaction_id,
        commission_amount,
        commission_rate,
        source_amount,
        earning_type,
        status
      ) VALUES (
        referrer_profile.id,
        NEW.user_id,
        NEW.id,
        commission_amount,
        commission_rate,
        ABS(NEW.amount),
        'share_purchase',
        'pending'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS calculate_referral_commission_trigger ON public.transactions;
CREATE TRIGGER calculate_referral_commission_trigger
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_referral_commission();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON public.referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred ON public.referral_commissions(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON public.referral_commissions(status);

-- Update referral statistics function to include commission data
CREATE OR REPLACE FUNCTION public.update_referral_statistics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
    (SELECT COUNT(*) FROM public.referral_commissions WHERE referrer_id = NEW.referrer_id),
    COALESCE((SELECT SUM(commission_amount) FROM public.referral_commissions WHERE referrer_id = NEW.referrer_id AND status = 'paid'), 0),
    COALESCE((SELECT SUM(commission_amount) FROM public.referral_commissions WHERE referrer_id = NEW.referrer_id AND status = 'pending'), 0),
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

-- Create trigger on referral_commissions table
DROP TRIGGER IF EXISTS update_referral_statistics_trigger ON public.referral_commissions;
CREATE TRIGGER update_referral_statistics_trigger
  AFTER INSERT OR UPDATE ON public.referral_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_referral_statistics();
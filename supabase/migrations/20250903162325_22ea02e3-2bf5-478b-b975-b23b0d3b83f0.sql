-- Create comprehensive triggers to coordinate authentication, wallet, and share systems

-- 1. Function to update share availability when transactions are completed
CREATE OR REPLACE FUNCTION update_share_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process completed purchase transactions
  IF NEW.status = 'completed' AND NEW.transaction_type = 'purchase' THEN
    -- Update available shares (reduce by quantity sold)
    UPDATE shares 
    SET 
      available_shares = available_shares - NEW.quantity,
      updated_at = now()
    WHERE id = NEW.share_id;
    
    -- Ensure we don't go below 0
    UPDATE shares 
    SET available_shares = GREATEST(available_shares, 0)
    WHERE id = NEW.share_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to automatically manage user share holdings
CREATE OR REPLACE FUNCTION manage_user_share_holdings()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process completed purchase transactions
  IF NEW.status = 'completed' AND NEW.transaction_type = 'purchase' THEN
    -- Check if user already has holdings for this share
    INSERT INTO user_shares (user_id, share_id, quantity, purchase_price_per_share, currency, status)
    VALUES (NEW.user_id, NEW.share_id, NEW.quantity, NEW.price_per_share, NEW.currency, 'available_for_trade')
    ON CONFLICT (user_id, share_id) 
    DO UPDATE SET 
      quantity = user_shares.quantity + NEW.quantity,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to automatically track referral commissions
CREATE OR REPLACE FUNCTION auto_track_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id UUID;
  commission_amount NUMERIC;
  commission_rate NUMERIC := 0.05; -- 5%
BEGIN
  -- Only process completed purchase transactions with actual amounts
  IF NEW.status = 'completed' AND NEW.transaction_type = 'purchase' AND NEW.total_amount > 0 THEN
    
    -- Get the referrer for this user
    SELECT referred_by INTO referrer_id 
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- If user has a referrer, create commission records
    IF referrer_id IS NOT NULL THEN
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

-- 4. Create the triggers on share_transactions table
DROP TRIGGER IF EXISTS trigger_update_share_availability ON share_transactions;
CREATE TRIGGER trigger_update_share_availability
  AFTER INSERT OR UPDATE ON share_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_share_availability();

DROP TRIGGER IF EXISTS trigger_manage_user_holdings ON share_transactions;
CREATE TRIGGER trigger_manage_user_holdings
  AFTER INSERT OR UPDATE ON share_transactions
  FOR EACH ROW
  EXECUTE FUNCTION manage_user_share_holdings();

DROP TRIGGER IF EXISTS trigger_auto_referral_commission ON share_transactions;
CREATE TRIGGER trigger_auto_referral_commission
  AFTER INSERT OR UPDATE ON share_transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_track_referral_commission();

-- 5. Fix existing data - update share availability based on completed transactions
UPDATE shares SET 
  available_shares = total_shares - COALESCE((
    SELECT SUM(quantity) 
    FROM share_transactions 
    WHERE share_id = shares.id 
    AND status = 'completed' 
    AND transaction_type = 'purchase'
  ), 0)
WHERE id IN (
  SELECT DISTINCT share_id 
  FROM share_transactions 
  WHERE status = 'completed' 
  AND transaction_type = 'purchase'
);

-- 6. Process existing transactions for referral commissions (one-time fix)
INSERT INTO referral_earnings (referrer_id, referred_id, transaction_id, earning_amount, earning_type, status)
SELECT DISTINCT
  p.referred_by as referrer_id,
  st.user_id as referred_id,
  st.id as transaction_id,
  st.total_amount * 0.05 as earning_amount,
  'share_purchase_commission' as earning_type,
  'pending' as status
FROM share_transactions st
JOIN profiles p ON st.user_id = p.id
WHERE st.status = 'completed' 
  AND st.transaction_type = 'purchase'
  AND st.total_amount > 0
  AND p.referred_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM referral_earnings re 
    WHERE re.referrer_id = p.referred_by 
    AND re.referred_id = st.user_id 
    AND re.transaction_id = st.id
  );

-- 7. Update referral statistics for existing data
INSERT INTO referral_statistics (user_id, pending_earnings, total_earnings, updated_at, last_activity_at)
SELECT 
  referrer_id,
  SUM(earning_amount) as pending_earnings,
  SUM(earning_amount) as total_earnings,
  now() as updated_at,
  now() as last_activity_at
FROM referral_earnings
WHERE status = 'pending'
GROUP BY referrer_id
ON CONFLICT (user_id) 
DO UPDATE SET 
  pending_earnings = EXCLUDED.pending_earnings,
  total_earnings = EXCLUDED.total_earnings,
  updated_at = now(),
  last_activity_at = now();